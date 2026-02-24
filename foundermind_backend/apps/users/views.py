import bcrypt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import User
from .jwt_utils import generate_access_token, generate_refresh_token


@api_view(['POST'])
def register(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Missing email or password"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects(email=email).first():
        return Response({"error": "User already exists"}, status=status.HTTP_400_BAD_REQUEST)

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

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

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return Response({"error": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

    access = generate_access_token(email)
    refresh = generate_refresh_token(email)

    return Response({
        "access_token": access,
        "refresh_token": refresh,
        "email": email
    })
