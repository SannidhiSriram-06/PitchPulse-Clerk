import os
from functools import wraps
import jwt
from jwt import PyJWKClient
from flask import request, jsonify, g

CLERK_JWKS_URL = os.getenv(
    "CLERK_JWKS_URL",
    "https://neat-katydid-70.clerk.accounts.dev/.well-known/jwks.json"
)

jwks_client = PyJWKClient(CLERK_JWKS_URL)

def verify_clerk_token(token: str) -> dict | None:
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
            issuer=os.getenv("CLERK_ISSUER", "https://neat-katydid-70.clerk.accounts.dev")
        )
        return payload
    except Exception as e:
        print(f"Clerk token verification failed: {e}")
        return None

def require_clerk_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Please login to continue"}), 401
        
        token = auth_header[len("Bearer "):]
        payload = verify_clerk_token(token)
        
        if not payload:
            return jsonify({"error": "Please login to continue"}), 401
        
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            return jsonify({"error": "Please login to continue"}), 401

        from models import User
        from database import db
        from datetime import datetime, UTC
        
        user = User.query.filter_by(clerk_user_id=clerk_user_id).first()
        if not user:
            # Auto-create user on first API call if webhook missed it
            email = ""
            email_data = payload.get("email", "")
            if email_data:
                email = email_data
            user = User(
                clerk_user_id=clerk_user_id,
                email=email,
                tier="free",
                briefs_used_this_hour=0,
            )
            db.session.add(user)
            db.session.commit()
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated
