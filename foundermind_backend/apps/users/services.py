import hashlib
import secrets
from datetime import datetime, timedelta

import bcrypt
from django.conf import settings


PASSWORD_RESET_SUCCESS_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)
PASSWORD_RESET_INVALID_TOKEN_MESSAGE = "Invalid or expired reset token."
PASSWORD_RESET_USER_NOT_FOUND_MESSAGE = "User not found. Please register yourself."


def hash_password(value: str) -> str:
    return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()


def verify_password(value: str, password_hash: str) -> bool:
    return bcrypt.checkpw(value.encode(), password_hash.encode())


def generate_password_reset_token():
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES
    )
    return raw_token, token_hash, expires_at


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def is_password_reset_mailer_request(request) -> bool:
    configured_key = getattr(settings, "PASSWORD_RESET_MAILER_KEY", "")
    provided_key = request.headers.get("X-Password-Reset-Mailer-Key", "")

    return bool(configured_key) and secrets.compare_digest(provided_key, configured_key)
