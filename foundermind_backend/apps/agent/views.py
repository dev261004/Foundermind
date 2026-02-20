from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import StartupAnalysisService
from core.permissions import jwt_required

@api_view(["POST"])
@jwt_required
def run_analysis(request):
    idea_id = request.data.get("idea_id")

    if not idea_id:
        return Response({"error": "Missing idea_id"}, status=400)

    try:
        result = StartupAnalysisService.run_analysis(idea_id)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)






