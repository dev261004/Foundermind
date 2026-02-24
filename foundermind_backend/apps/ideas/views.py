from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Idea


from core.permissions import jwt_required


@api_view(['POST'])
def create_idea(request):
    user_email = request.data.get("user_email")
    title = request.data.get("title")
    description = request.data.get("description", "")

    if not title:
        return Response({"error": "Missing title"}, status=400)

    idea = Idea(
        user_email=user_email,
        title=title,
        description=description
    )
    idea.save()

    return Response({
        "message": "Idea created successfully",
        "idea": idea.to_json()
    })


@api_view(['GET'])
@jwt_required
def get_ideas(request):
    email = request.user_email
    ideas = Idea.objects(user_email=email)

    return Response({
        "ideas": [idea.to_json() for idea in ideas]
    })
