from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User
import bcrypt

@api_view(['GET'])
def home(request):
    return Response({"message": "Welcome to FounderMind API"})

@api_view(['POST'])
def register(request):
    email = request.data['email']
    password = request.data['password']
    if User.objects(email=email):
        return Response({"error": "User already exists"}, status=400)
    hash_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(email=email, password_hash=hash_pw)
    user.save()
    return Response({"message": "Registered successfully"})

@api_view(['POST'])
def login(request):
    email = request.data['email']
    password = request.data['password']
    user = User.objects(email=email).first()
    if user and bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return Response({"message": "Login successful", "email": email})
    return Response({"error": "Invalid credentials"}, status=400)
