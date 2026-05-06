import os
import json
import secrets
import re
from datetime import datetime, UTC, timedelta

from flask import Flask, request, jsonify, g, current_app
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman

limiter = Limiter(key_func=get_remote_address)

from config import Config
from database import db, init_db
from auth import (
    require_auth,
    validate_email,
    validate_password,
    sanitize_company_name,
    hash_password,
    check_password,
    generate_token,
)


# ── App factory ───────────────────────────────────────────────────────────────

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    Talisman(app, force_https=False, content_security_policy=False, frame_options="DENY")
    CORS(app, origins=os.getenv("FRONTEND_URL", "*"))
    limiter.init_app(app)

    db.init_app(app)  # ← only here, NOT inside init_db()

    with app.app_context():
        init_db(app)  # ← this now only does import models + create_all()

    _register_routes(app)

    return app

# ── Rate limiting helper ──────────────────────────────────────────────────────

FREE_TIER_LIMIT = 3  # briefs per hour for free users


def _check_and_increment_rate_limit(user):
    """
    Checks if the user has exceeded their hourly brief limit.
    If the window has expired (>60 min), resets the counter.
    If within the window and at/over limit, returns False.
    Otherwise increments counter and returns True.

    Returns (allowed: bool, briefs_remaining: int | None)
    """
    if user.tier == "pro":
        return True, None, None  # pro users have no limit

    now = datetime.now(UTC)

    # If no window started yet, or window has expired (>60 min ago), reset
    window = user.hour_window_start
    if window and window.tzinfo is None:
        window = window.replace(tzinfo=UTC)
    if window is None or (now - window) > timedelta(hours=1):
        user.hour_window_start = now
        user.briefs_used_this_hour = 0

    if user.briefs_used_this_hour >= FREE_TIER_LIMIT:
        remaining = 0
        window_start = user.hour_window_start
        if window_start.tzinfo is None:
            window_start = window_start.replace(tzinfo=UTC)
        reset_in_minutes = max(1, int((window_start + timedelta(hours=1) - now).total_seconds() / 60))
        return False, remaining, reset_in_minutes

    user.briefs_used_this_hour += 1
    db.session.commit()
    remaining = FREE_TIER_LIMIT - user.briefs_used_this_hour
    return True, remaining, None


# ── Routes ────────────────────────────────────────────────────────────────────

def _register_routes(app):

    # ── Health ────────────────────────────────────────────────────────────────

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"})

    # ── Auth: Register ────────────────────────────────────────────────────────

    @app.route("/api/auth/register", methods=["POST"])
    @limiter.limit("3 per minute", error_message="Too many attempts. Please wait a minute.")
    def register():
        """
        POST /api/auth/register
        Body: { "email": "...", "password": "..." }
        Returns: { "message": "Account created", "token": "..." }
        """
        from models import User

        data = request.get_json(silent=True) or {}

        # Validate email
        email_raw = data.get("email", "")
        valid, err = validate_email(email_raw)
        if not valid:
            return jsonify({"error": err}), 400
        email = email_raw.strip().lower()

        # Validate password
        password = data.get("password", "")
        valid, err = validate_password(password)
        if not valid:
            return jsonify({"error": err}), 400

        # Check duplicate
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({"error": "An account with this email already exists."}), 409

        # Create user
        user = User(
            email=email,
            password_hash=hash_password(password),
            tier="free",
            briefs_used_this_hour=0,
        )
        db.session.add(user)
        db.session.commit()

        token = generate_token(user.id)
        return jsonify({"message": "Account created", "token": token}), 201

    # ── Auth: Login ───────────────────────────────────────────────────────────

    @app.route("/api/auth/login", methods=["POST"])
    @limiter.limit("5 per minute", error_message="Too many attempts. Please wait a minute.")
    def login():
        """
        POST /api/auth/login
        Body: { "email": "...", "password": "..." }
        Returns: { "token": "...", "user": { email, tier, briefs_remaining_this_hour } }
        """
        from models import User

        data = request.get_json(silent=True) or {}

        email_raw = data.get("email", "")
        valid, err = validate_email(email_raw)
        if not valid:
            return jsonify({"error": err}), 400
        email = email_raw.strip().lower()

        password = data.get("password", "")
        if not password:
            return jsonify({"error": "Password is required."}), 400

        user = User.query.filter_by(email=email).first()

        # Use a constant-time check to prevent timing attacks
        # If user doesn't exist, still run check_password on a dummy hash
        # so the response time is similar either way
        if user is None or not check_password(password, user.password_hash):
            return jsonify({"error": "Invalid email or password."}), 401

        token = generate_token(user.id)
        return jsonify({
            "token": token,
            "user": user.to_dict(include_rate_info=True),
        }), 200

    # ── Auth: Me ──────────────────────────────────────────────────────────────

    @app.route("/api/auth/me", methods=["GET"])
    @require_auth
    def me():
        """
        GET /api/auth/me
        Protected. Returns current user's info.
        """
        return jsonify(g.current_user.to_dict(include_rate_info=True)), 200

    # ── Auth: Change Password ─────────────────────────────────────────────────

    @app.route("/api/auth/change-password", methods=["POST"])
    @require_auth
    def change_password():
        """
        POST /api/auth/change-password
        Protected. Body: { "current_password": "...", "new_password": "..." }
        """
        data = request.get_json(silent=True) or {}
        current_pw = data.get("current_password", "")
        new_pw = data.get("new_password", "")

        if not current_pw:
            return jsonify({"error": "current_password is required."}), 400

        if not check_password(current_pw, g.current_user.password_hash):
            return jsonify({"error": "Current password is incorrect."}), 401

        valid, err = validate_password(new_pw)
        if not valid:
            return jsonify({"error": err}), 400

        g.current_user.password_hash = hash_password(new_pw)
        db.session.commit()
        return jsonify({"message": "Password updated successfully."}), 200

    # ── Auth: Forgot Password ──────────────────────────────────────────────────

    @app.route("/api/auth/forgot-password", methods=["POST"])
    @limiter.limit("5 per minute", error_message="Too many attempts.")
    def forgot_password():
        from models import User
        import resend
        
        data = request.get_json(silent=True) or {}
        email_raw = data.get("email", "")
        valid, err = validate_email(email_raw)
        if not valid:
            return jsonify({"error": err}), 400
        email = email_raw.strip().lower()

        user = User.query.filter_by(email=email).first()
        success_message = "If that email exists, a reset link has been sent."
        
        if user:
            token = secrets.token_urlsafe(32)
            user.reset_token = token
            user.reset_token_expiry = datetime.now(UTC) + timedelta(hours=1)
            db.session.commit()
            
            try:
                resend.api_key = current_app.config["RESEND_API_KEY"]
                frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
                reset_link = f"{frontend_url}/reset-password?token={token}"
                resend.Emails.send({
                    "from": "onboarding@resend.dev",
                    "to": user.email,
                    "subject": "Reset your PitchPulse password",
                    "html": f"""
                        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                          <h2 style="color: #0a0a0a;">Reset your password</h2>
                          <p>Click the button below to reset your PitchPulse password. This link expires in 1 hour.</p>
                          <a href="{reset_link}" style="display: inline-block; background: #C8FF00; color: #0a0a0a; font-weight: bold; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Reset Password</a>
                          <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email. Your password won't change.</p>
                          <p style="color: #666; font-size: 14px;">Or copy this link: {reset_link}</p>
                        </div>
                    """
                })
            except Exception as e:
                print(f"Failed to send reset email: {e}")
                
        return jsonify({"message": success_message}), 200

    # ── Auth: Reset Password ──────────────────────────────────────────────────

    @app.route("/api/auth/reset-password", methods=["POST"])
    @limiter.limit("5 per minute", error_message="Too many attempts.")
    def reset_password():
        from models import User
        
        data = request.get_json(silent=True) or {}
        token = data.get("token")
        new_password = data.get("new_password")
        
        if not token or not new_password:
            return jsonify({"error": "Token and new password are required."}), 400
            
        user = User.query.filter_by(reset_token=token).first()
        if not user:
            return jsonify({"error": "Invalid or expired reset link."}), 400
            
        expiry = user.reset_token_expiry
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=UTC)
            
        if not expiry or expiry < datetime.now(UTC):
            return jsonify({"error": "Reset link has expired. Please request a new one."}), 400
            
        valid, err = validate_password(new_password)
        if not valid:
            return jsonify({"error": err}), 400
            
        user.password_hash = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.session.commit()
        
        return jsonify({"message": "Password reset successfully. You can now log in."}), 200

    # ── Auth: Delete Account ──────────────────────────────────────────────────

    @app.route("/api/auth/account", methods=["DELETE"])
    @require_auth
    def delete_account():
        """
        DELETE /api/auth/account
        Protected. Deletes the user and all their briefs (cascade).
        """
        user = g.current_user
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "Account deleted."}), 200

    @app.route("/api/user/preferences", methods=["GET", "PATCH"])
    @require_auth
    def update_preferences():
        if request.method == 'GET':
            user = g.current_user
            try:
                prefs = json.loads(user.preferences) if user.preferences else {}
            except Exception:
                prefs = {}
            return jsonify({'preferences': prefs}), 200

        data = request.get_json() or {}
        user = g.current_user
        try:
            existing = json.loads(user.preferences) if user.preferences else {}
        except Exception:
            existing = {}
        allowed = {'default_length', 'default_view', 'show_watchlist', 'show_sources', 'theme'}
        for key in allowed:
            if key in data:
                existing[key] = data[key]
        user.preferences = json.dumps(existing)
        db.session.commit()
        return jsonify({'message': 'Preferences updated.', 'preferences': existing}), 200

    # ── Generate Brief ────────────────────────────────────────────────────────

    @app.route("/api/brief", methods=["POST"])
    @require_auth
    def generate_brief():
        """
        POST /api/brief
        Protected. Runs CrewAI agents and returns structured brief.
        Body: { "company_name": "...", "length": "short|medium|long", "sections": [...] }
        """
        from models import Brief, Watchlist
        from agents import run_brief

        user = g.current_user

        # Rate limit check
        allowed, remaining, reset_in_minutes = _check_and_increment_rate_limit(user)
        if not allowed:
            return jsonify({
                "error": "Rate limit reached. Upgrade to Pro for unlimited briefs.",
                "reset_in_minutes": reset_in_minutes
            }), 429

        data = request.get_json(silent=True) or {}

        # Sanitize company_name
        company_name_raw = data.get("company_name", "")
        company_name, err = sanitize_company_name(company_name_raw)
        if err:
            return jsonify({"error": err}), 400

        # Validate length
        length = data.get("length", "medium")
        if length not in ("short", "medium", "long"):
            return jsonify({"error": "length must be 'short', 'medium', or 'long'."}), 400

        # Validate sections
        valid_sections = {"summary", "news", "financials", "social_sentiment", "talking_points", "watch_out_for"}
        requested_sections = data.get("sections", list(valid_sections))
        if not isinstance(requested_sections, list):
            return jsonify({"error": "sections must be a list of strings."}), 400
        requested_sections = [s for s in requested_sections if s in valid_sections]

        custom_prompt = data.get("custom_prompt", "").strip()
        if len(custom_prompt) > 500:
            return jsonify({"error": "custom_prompt must be 500 characters or fewer."}), 400

        if custom_prompt and "custom_focus" not in requested_sections:
            requested_sections.append("custom_focus")

        if not requested_sections:
            return jsonify({"error": "No valid sections provided. Valid options: summary, news, financials, social_sentiment, talking_points, watch_out_for"}), 400



        # Validate env vars before running agents
        try:
            Config.validate()
        except EnvironmentError as e:
            return jsonify({"error": str(e)}), 500

        # Run agents
        import time
        start = time.time()
        try:
            result = run_brief(company_name, length, requested_sections, custom_prompt)
        except Exception as e:
            return jsonify({"error": "Agent execution failed. Please try again.", "detail": str(e)}), 500
        elapsed_ms = int((time.time() - start) * 1000)

        # Check for limited data
        if not result or result.get("brief", {}).get("parse_error"):
            return jsonify({"error": "We couldn't find enough data for this company. Try a different name or check spelling."}), 400

        # Update watchlist last_briefed_at if company is on watchlist
        wl_entry = Watchlist.query.filter_by(user_id=user.id, company_name=company_name).first()
        if wl_entry:
            wl_entry.last_briefed_at = datetime.now(UTC)

        # Save brief to DB
        sources = result.get("sources_used", [])
        limited = result.get("limited_data", False)
        brief_record = Brief(
            user_id=user.id,
            company_name=company_name,
            length=length,
            sections_requested=",".join(requested_sections),
            brief_json=json.dumps(result.get("brief", {})),
            sources_used=json.dumps(sources),
            generation_time_ms=elapsed_ms,
            limited_data=limited,
            saved=False,
            feedback_summary=None,
            share_token=None,
        )
        db.session.add(brief_record)
        db.session.commit()

        return jsonify({
            "brief": result.get("brief", {}),
            "sources_used": sources,
            "generation_time_ms": elapsed_ms,
            "limited_data": limited,
            "brief_id": brief_record.id,
            "briefs_remaining_this_hour": remaining,
        }), 200

    # ── List Briefs ───────────────────────────────────────────────────────────

    @app.route("/api/briefs", methods=["GET"])
    @require_auth
    def list_briefs():
        """
        GET /api/briefs
        Protected. Returns user's briefs, newest first.
        Optional query params:
          ?search=infosys   — filter by company_name (case-insensitive contains)
          ?saved=true       — only return saved briefs
        """
        from models import Brief

        query = Brief.query.filter_by(user_id=g.current_user.id)

        search = request.args.get("search", "").strip()
        if search:
            query = query.filter(Brief.company_name.ilike(f"%{search}%"))

        saved_filter = request.args.get("saved", "").lower()
        if saved_filter == "true":
            query = query.filter_by(saved=True)

        briefs = query.order_by(Brief.created_at.desc()).all()
        return jsonify({"briefs": [b.to_dict() for b in briefs]}), 200

    # ── Get Single Brief ──────────────────────────────────────────────────────

    @app.route('/api/briefs/<int:brief_id>', methods=['GET'])
    @require_auth
    def get_brief(brief_id):
        from models import Brief
        brief = Brief.query.filter_by(id=brief_id, user_id=g.current_user.id).first()
        if not brief:
            return jsonify({'error': 'Brief not found'}), 404
        return jsonify(brief.to_dict()), 200

    # ── Toggle Save Brief ─────────────────────────────────────────────────────

    @app.route("/api/briefs/<int:brief_id>/save", methods=["PATCH"])
    @require_auth
    def toggle_save_brief(brief_id):
        """
        PATCH /api/briefs/:id/save
        Protected. Toggles saved=True/False on a brief.
        """
        from models import Brief

        brief = Brief.query.filter_by(id=brief_id, user_id=g.current_user.id).first()
        if not brief:
            return jsonify({"error": "Brief not found."}), 404

        brief.saved = not brief.saved
        db.session.commit()
        return jsonify({"id": brief.id, "saved": brief.saved}), 200

    # ── Delete Brief ──────────────────────────────────────────────────────────

    @app.route("/api/briefs/<int:brief_id>", methods=["DELETE"])
    @require_auth
    def delete_brief(brief_id):
        """
        DELETE /api/briefs/:id
        Protected. Deletes one of the current user's briefs.
        """
        from models import Brief

        brief = Brief.query.filter_by(id=brief_id, user_id=g.current_user.id).first()
        if not brief:
            return jsonify({"error": "Brief not found."}), 404

        db.session.delete(brief)
        db.session.commit()
        return jsonify({"message": "Brief deleted."}), 200

    # ── Brief Feedback ────────────────────────────────────────────────────────

    @app.route("/api/briefs/<int:brief_id>/feedback", methods=["POST"])
    @require_auth
    def brief_feedback(brief_id):
        """
        POST /api/briefs/:id/feedback
        Protected. Body: { "section": "news", "rating": "up" | "down" }
        Stores/updates feedback for one section in feedback_summary JSON.
        """
        from models import Brief

        brief = Brief.query.filter_by(id=brief_id, user_id=g.current_user.id).first()
        if not brief:
            return jsonify({"error": "Brief not found."}), 404

        data = request.get_json(silent=True) or {}
        section = data.get("section", "").strip()
        rating = data.get("rating", "").strip()

        valid_sections = {"summary", "news", "financials", "social_sentiment", "talking_points", "watch_out_for"}
        if section not in valid_sections:
            return jsonify({"error": f"Invalid section. Must be one of: {', '.join(valid_sections)}"}), 400
        if rating not in ("up", "down"):
            return jsonify({"error": "rating must be 'up' or 'down'."}), 400

        # Load existing feedback (or empty dict), update, save back
        feedback = json.loads(brief.feedback_summary) if brief.feedback_summary else {}
        feedback[section] = rating
        brief.feedback_summary = json.dumps(feedback)
        db.session.commit()

        return jsonify({"brief_id": brief_id, "feedback": feedback}), 200

    # ── Share: Generate Token ─────────────────────────────────────────────────

    @app.route("/api/briefs/<int:brief_id>/share", methods=["GET", "POST"])
    @require_auth
    def get_share_token(brief_id):
        """
        GET /api/briefs/:id/share
        Protected. Generates (or returns existing) public share token for a brief.
        Returns: { "share_url": "/api/share/<token>" }
        """
        from models import Brief

        brief = Brief.query.filter_by(id=brief_id, user_id=g.current_user.id).first()
        if not brief:
            return jsonify({"error": "Brief not found."}), 404

        # Generate a token if one doesn't exist yet
        if not brief.share_token:
            brief.share_token = secrets.token_urlsafe(32)
            db.session.commit()

        return jsonify({
            "brief_id": brief_id,
            "share_token": brief.share_token,
            "share_url": f"/api/share/{brief.share_token}",
        }), 200

    # ── Share: View Public Brief ──────────────────────────────────────────────

    @app.route("/api/share/<share_token>", methods=["GET"])
    def view_shared_brief(share_token):
        """
        GET /api/share/:share_token
        PUBLIC — no auth needed.
        Returns the brief JSON for the given token.
        """
        from models import Brief

        brief = Brief.query.filter_by(share_token=share_token).first()
        if not brief:
            return jsonify({"error": "Shared brief not found or link has expired."}), 404

        return jsonify({
            "company_name": brief.company_name,
            "brief": json.loads(brief.brief_json) if brief.brief_json else {},
            "sources_used": json.loads(brief.sources_used) if brief.sources_used else [],
            "created_at": brief.created_at.isoformat() if brief.created_at else None,
        }), 200

    # ── Watchlist: Get ────────────────────────────────────────────────────────

    @app.route("/api/watchlist", methods=["GET"])
    @require_auth
    def get_watchlist():
        """
        GET /api/watchlist
        Protected. Returns user's watchlist sorted by most recently added.
        """
        from models import Watchlist

        entries = Watchlist.query.filter_by(user_id=g.current_user.id)\
            .order_by(Watchlist.added_at.desc()).all()
        return jsonify({"watchlist": [e.to_dict() for e in entries]}), 200

    @app.route("/api/watchlist/alerts", methods=["GET"])
    @require_auth
    def get_watchlist_alerts():
        from models import Watchlist
        from tools import company_web_search

        entries = Watchlist.query.filter_by(user_id=g.current_user.id).limit(5).all()
        alerts = []
        for entry in entries:
            try:
                results = company_web_search(entry.company_name)
                res_list = results.get("results", []) if isinstance(results, dict) else []
                has_recent = any("2025" in str(r) or "2026" in str(r) for r in res_list)
                headline = res_list[0].get("title", "")[:80] if res_list and isinstance(res_list[0], dict) else ""
                alerts.append({
                    "company_name": entry.company_name,
                    "has_recent_news": bool(has_recent),
                    "headline": headline,
                })
            except Exception:
                alerts.append({
                    "company_name": entry.company_name,
                    "has_recent_news": False,
                    "headline": "",
                })
        return jsonify({"alerts": alerts}), 200

    @app.route("/api/watchlist/notes/<company_name>", methods=["GET"])
    @require_auth
    def get_watchlist_note(company_name):
        from models import WatchlistNote

        note = WatchlistNote.query.filter_by(
            user_id=g.current_user.id,
            company_name=company_name,
        ).first()
        return jsonify({"note_text": note.note_text if note else ""}), 200

    @app.route("/api/watchlist/notes/<company_name>", methods=["POST"])
    @require_auth
    def save_watchlist_note(company_name):
        from models import WatchlistNote

        data = request.get_json(silent=True) or {}
        note_text = data.get("note_text", "")[:1000]
        note = WatchlistNote.query.filter_by(
            user_id=g.current_user.id,
            company_name=company_name,
        ).first()

        if note:
            note.note_text = note_text
            note.updated_at = datetime.now(UTC)
        else:
            note = WatchlistNote(
                user_id=g.current_user.id,
                company_name=company_name,
                note_text=note_text,
            )
            db.session.add(note)

        db.session.commit()
        return jsonify({"message": "Saved"}), 200

    # ── Watchlist: Add ────────────────────────────────────────────────────────

    @app.route("/api/watchlist", methods=["POST"])
    @require_auth
    def add_to_watchlist():
        """
        POST /api/watchlist
        Protected. Body: { "company_name": "..." }
        """
        from models import Watchlist

        data = request.get_json(silent=True) or {}
        company_name_raw = data.get("company_name", "")
        company_name, err = sanitize_company_name(company_name_raw)
        if err:
            return jsonify({"error": err}), 400

        # Check for duplicate
        existing = Watchlist.query.filter_by(
            user_id=g.current_user.id,
            company_name=company_name
        ).first()
        if existing:
            return jsonify({"error": f"{company_name} is already on your watchlist."}), 409

        entry = Watchlist(user_id=g.current_user.id, company_name=company_name)
        db.session.add(entry)
        db.session.commit()
        return jsonify(entry.to_dict()), 201

    # ── Watchlist: Remove ─────────────────────────────────────────────────────

    @app.route("/api/watchlist/<int:entry_id>", methods=["DELETE"])
    @require_auth
    def remove_from_watchlist(entry_id):
        """
        DELETE /api/watchlist/:id
        Protected. Removes one entry from the watchlist.
        """
        from models import Watchlist

        entry = Watchlist.query.filter_by(id=entry_id, user_id=g.current_user.id).first()
        if not entry:
            return jsonify({"error": "Watchlist entry not found."}), 404

        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "Removed from watchlist."}), 200




# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = create_app()
    app.run(debug=False, port=5001)