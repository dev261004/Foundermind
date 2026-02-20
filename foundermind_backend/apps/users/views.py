from .jwt_utils import generate_access_token, generate_refresh_token


@api_view(['POST'])
def register(request):
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({"error": "Missing email or password"}, status=400)

    if User.objects(email=email):
        return Response({"error": "User already exists"}, status=400)

    hash_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    user = User(
        email=email,
        password_hash=hash_pw
    )
    user.save()

    # Auto-login after register
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
    email = request.data['email']
    password = request.data['password']

    user = User.objects(email=email).first()

    if user and bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        access = generate_access_token(email)
        refresh = generate_refresh_token(email)

        return Response({
            "access_token": access,
            "refresh_token": refresh,
            "email": email
        })

    return Response({"error": "Invalid credentials"}, status=400)