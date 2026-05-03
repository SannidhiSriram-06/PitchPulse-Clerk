import re
import jwt
import bcrypt
from datetime import datetime, UTC, timedelta
from functools import wraps
from flask import request, jsonify, g, current_app


# ── Input validation ──────────────────────────────────────────────────────────

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
COMPANY_NAME_REGEX = re.compile(r"^[a-zA-Z0-9 \-.,&'()]+$")


def validate_email(email: str) -> tuple[bool, str]:
    if not email or not isinstance(email, str):
        return False, "Email is required."
    email = email.strip().lower()
    if len(email) > 255:
        return False, "Email is too long."
    if not EMAIL_REGEX.match(email):
        return False, "Invalid email format."
    return True, ""


def validate_password(password: str) -> tuple[bool, str]:
    if not password or not isinstance(password, str):
        return False, "Password is required."
    if len(password) < 8:
        return False, "Password must be at least 8 characters."
    if len(password) > 128:
        return False, "Password is too long (max 128 chars)."
    return True, ""


def sanitize_company_name(name: str) -> tuple[str | None, str]:
    if not name or not isinstance(name, str):
        return None, "company_name is required."
    name = name.strip()
    if len(name) < 2:
        return None, "company_name must be at least 2 characters."
    if len(name) > 100:
        return None, "company_name must be 100 characters or fewer."
    if not COMPANY_NAME_REGEX.match(name):
        return None, "company_name contains invalid characters. Use letters, numbers, spaces, and - . , & ' ( ) only."
    return name, ""


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers ───────────────────────────────────────────────────────────────

def generate_token(user_id: int) -> str:
    config = current_app.config
    expiry_hours = config.get("JWT_EXPIRY_HOURS", 24)
    secret = config["JWT_SECRET_KEY"]
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(hours=expiry_hours),
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token


def decode_token(token: str) -> tuple[dict | None, str]:
    secret = current_app.config["JWT_SECRET_KEY"]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload, ""
    except jwt.ExpiredSignatureError:
        return None, "Session expired, please login again"
    except jwt.InvalidTokenError:
        return None, "Please login to continue"


# ── Auth decorator ────────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Please login to continue"}), 401

        token = auth_header[len("Bearer "):]

        payload, error = decode_token(token)
        if error:
            return jsonify({"error": error}), 401

        from models import User
        user = User.query.get(int(payload["sub"]))  # ← the fix
        if not user:
            return jsonify({"error": "Please login to continue"}), 401

        g.current_user = user
        return f(*args, **kwargs)

    return decorated