import secrets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime

from .models import User
from .jwt_utils import generate_access_token, generate_refresh_token
from .services import (
    PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    PASSWORD_RESET_SUCCESS_MESSAGE,
    PASSWORD_RESET_USER_NOT_FOUND_MESSAGE,
    generate_password_reset_token,
    hash_password,
    hash_reset_token,
    is_password_reset_mailer_request,
    verify_password,
)


@api_view(['POST'])
def register(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Missing email or password"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects(email=email).first():
        return Response({"error": "User already exists"}, status=status.HTTP_400_BAD_REQUEST)

    hashed = hash_password(password)

    user = User(
        email=email,
        password_hash=hashed
    )
    user.save()

    access = generate_access_token(email)
    refresh = generate_refresh_token(email)

    return Response({
        "message": "Registered successfully",
        "access_token": access,
        "refresh_token": refresh,
        "email": email
    })


@api_view(['POST'])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Missing credentials"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects(email=email).first()

    if not user:
        return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)

    if not verify_password(password, user.password_hash):
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    access = generate_access_token(email)
    refresh = generate_refresh_token(email)

    return Response({
        "access_token": access,
        "refresh_token": refresh,
        "email": email
    })


@api_view(['POST'])
def forgot_password(request):
    email = (request.data.get("email") or "").strip()

    if not email:
        return Response({"error": "Missing email"}, status=status.HTTP_400_BAD_REQUEST)

    response_payload = {"message": PASSWORD_RESET_SUCCESS_MESSAGE}
    user = User.objects(email=email).first()

    if not user:
        return Response(
            {"error": PASSWORD_RESET_USER_NOT_FOUND_MESSAGE},
            status=status.HTTP_404_NOT_FOUND,
        )

    raw_token, token_hash, expires_at = generate_password_reset_token()
    user.password_reset_token_hash = token_hash
    user.password_reset_expires_at = expires_at
    user.save()

    if is_password_reset_mailer_request(request):
        response_payload["reset_token"] = raw_token
        response_payload["expires_in_minutes"] = (
            int((expires_at - datetime.utcnow()).total_seconds() // 60) or 0
        )

    return Response(response_payload)


@api_view(['POST'])
def reset_password(request):
    email = (request.data.get("email") or "").strip()
    token = (request.data.get("token") or "").strip()
    password = request.data.get("password") or ""

    if not email or not token or not password:
        return Response({"error": "Missing email, token, or password"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects(email=email).first()

    if not user or not user.password_reset_token_hash or not user.password_reset_expires_at:
        return Response({"error": PASSWORD_RESET_INVALID_TOKEN_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)

    if user.password_reset_expires_at < datetime.utcnow():
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        user.save()
        return Response({"error": PASSWORD_RESET_INVALID_TOKEN_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)

    if not secrets.compare_digest(hash_reset_token(token), user.password_reset_token_hash):
        return Response({"error": PASSWORD_RESET_INVALID_TOKEN_MESSAGE}, status=status.HTTP_400_BAD_REQUEST)

    user.password_hash = hash_password(password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    user.save()

    return Response({"message": "Password reset successfully."})
