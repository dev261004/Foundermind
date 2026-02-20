from rest_framework.response import Response
from rest_framework import status
from apps.users.jwt_utils import decode_token


class JWTAuthenticationMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = decode_token(token)

            if payload:
                request.user_email = payload["email"]
            else:
                return Response(
                    {"error": "Invalid or expired token"},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        return self.get_response(request)