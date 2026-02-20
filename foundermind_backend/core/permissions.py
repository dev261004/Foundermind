from rest_framework.response import Response
from rest_framework import status
from apps.users.jwt_utils import decode_token


def jwt_required(view_func):

    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return Response({"error": "Authentication required"}, status=401)

        token = auth_header.split(" ")[1]
        payload = decode_token(token)

        if not payload:
            return Response({"error": "Invalid or expired token"}, status=401)

        request.user_email = payload["email"]

        return view_func(request, *args, **kwargs)

    return wrapper