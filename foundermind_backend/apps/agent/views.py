from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import StartupAnalysisService
from core.permissions import jwt_required
from apps.agent.tasks import run_startup_analysis
from apps.agent.models import AgentRun


@api_view(["POST"])
def start_analysis(request):

    idea_id = request.data.get("idea_id")

    agent_run = AgentRun(
        idea_id=idea_id,
        status="pending"
    )
    agent_run.save()

    run_startup_analysis.delay(str(agent_run.id))

    return Response({
        "agent_run_id": str(agent_run.id),
        "status": "pending"
    })

@api_view(["POST"])
def run_analysis(request):
    idea_id = request.data.get("idea_id")

    if not idea_id:
        return Response({"error": "Missing idea_id"}, status=400)

    try:
        result = StartupAnalysisService.run_analysis(idea_id)
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
def get_analysis_status(request, run_id):

    run = AgentRun.objects(id=run_id).first()

    if not run:
        return Response({"error": "Not found"}, status=404)

    return Response({
        "status": run.status,
        "execution_log": run.execution_log,
        "critique": run.critique,
        "confidence": getattr(run, "analysis_confidence", None)
    })