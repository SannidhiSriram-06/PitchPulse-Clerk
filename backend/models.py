import json
from datetime import datetime, UTC
from database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)        # NEW — bcrypt hash
    tier = db.Column(db.String(50), default="free", nullable=False)
    briefs_used_this_hour = db.Column(db.Integer, default=0, nullable=False)
    hour_window_start = db.Column(db.DateTime(timezone=True), nullable=True)
    preferences = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Relationships
    briefs = db.relationship("Brief", back_populates="user", cascade="all, delete-orphan")
    watchlist = db.relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self, include_rate_info=False):
        """Safe dict — never includes password_hash."""
        data = {
            "id": self.id,
            "email": self.email,
            "tier": self.tier,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_rate_info:
            data["briefs_used_this_hour"] = self.briefs_used_this_hour
            data["briefs_remaining_this_hour"] = max(
                0, 3 - self.briefs_used_this_hour
            ) if self.tier == "free" else None
        return data


class Brief(db.Model):
    __tablename__ = "briefs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    company_name = db.Column(db.String(255), nullable=False)
    length = db.Column(db.String(50), default="medium")
    sections_requested = db.Column(db.Text)          # comma-separated
    brief_json = db.Column(db.Text)                  # full JSON blob
    sources_used = db.Column(db.Text)                # JSON array string
    generation_time_ms = db.Column(db.Integer)
    limited_data = db.Column(db.Boolean, default=False)
    saved = db.Column(db.Boolean, default=False)     # NEW — user bookmarked this brief
    feedback_summary = db.Column(db.Text, nullable=True)  # NEW — JSON {"news": "up", ...}
    share_token = db.Column(db.String(64), unique=True, nullable=True)  # NEW — public share token
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(UTC))

    # Relationship
    user = db.relationship("User", back_populates="briefs")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "company_name": self.company_name,
            "length": self.length,
            "sections_requested": self.sections_requested.split(",") if self.sections_requested else [],
            "brief": json.loads(self.brief_json) if self.brief_json else None,
            "sources_used": json.loads(self.sources_used) if self.sources_used else [],
            "generation_time_ms": self.generation_time_ms,
            "limited_data": self.limited_data,
            "saved": self.saved,
            "feedback_summary": json.loads(self.feedback_summary) if self.feedback_summary else {},
            "share_token": self.share_token,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Watchlist(db.Model):
    __tablename__ = "watchlist"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_name = db.Column(db.String(255), nullable=False)
    added_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(UTC))
    last_briefed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationship
    user = db.relationship("User", back_populates="watchlist")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "company_name": self.company_name,
            "added_at": self.added_at.isoformat() if self.added_at else None,
            "last_briefed_at": self.last_briefed_at.isoformat() if self.last_briefed_at else None,
        }