from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Idea

# POST /save-idea
@api_view(['POST'])
def save_idea(request):
    data = request.data
    idea = Idea(**data)
    idea.save()
    return Response({"message": "Idea saved successfully"})

# GET /my-ideas?email=user@example.com
@api_view(['GET'])
def get_ideas(request):
    email = request.GET.get("email")
    if not email:
        return Response({"ideas": []})

    ideas = Idea.objects(user_email=email)

    # Return consistent JSON with id as string and ISO datetime
    result = []
    for idea in ideas:
        data = idea.to_mongo().to_dict()
        data["id"] = str(data.pop("_id"))   # convert ObjectId to string
        data.pop("_cls", None)              # remove MongoEngine metadata
        # Convert created_at to ISO string
        if "created_at" in data and data["created_at"]:
            data["created_at"] = data["created_at"].isoformat()
        result.append(data)

    return Response({"ideas": result})

# DELETE /delete-idea
@api_view(['POST'])
def delete_idea(request):
    idea_id = request.data.get("id")
    user_email = request.data.get("email")  # optional if you want to filter by user

    if not idea_id:
        return Response({"error": "Missing idea id"}, status=400)

    # Delete the idea
    deleted = Idea.objects(id=idea_id).delete()

    if deleted:
        # Fetch updated list for the user
        if user_email:
            ideas = Idea.objects(user_email=user_email)
        else:
            ideas = Idea.objects()

        result = []
        for idea in ideas:
            data = idea.to_mongo().to_dict()
            data["id"] = str(data.pop("_id"))
            data.pop("_cls", None)
            if "created_at" in data and data["created_at"]:
                data["created_at"] = data["created_at"].isoformat()
            result.append(data)

        return Response({"message": "Idea deleted", "ideas": result})

    return Response({"error": "Idea not found"}, status=404)
