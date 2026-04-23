from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import StartupAnalysisService
from apps.agent.tasks import run_startup_analysis
from apps.agent.models import AgentRun, IdeaAnalysis


@api_view(["POST"])
def start_analysis(request):

    idea_id = request.data.get("idea_id")
    force = bool(request.data.get("force"))
    if not idea_id:
        return Response({"error": "Missing idea_id"}, status=400)

    if not force:
        latest_completed_run = AgentRun.objects(
            idea_id=idea_id,
            status="completed"
        ).order_by("-created_at").first()
        latest_analysis = IdeaAnalysis.objects(idea_id=idea_id).order_by("-created_at").first()

        if latest_completed_run and latest_analysis:
            return Response({
                "agent_run_id": str(latest_completed_run.id),
                "status": "completed",
                "result": StartupAnalysisService.build_run_response(
                    latest_completed_run,
                    analysis=latest_analysis,
                ),
                "mode": "cached",
            })

    agent_run = AgentRun(
        idea_id=idea_id,
        status="pending"
    )
    agent_run.save()

    try:
        run_startup_analysis.delay(str(agent_run.id))
    except Exception:
        agent_run.delete()

        result = StartupAnalysisService.run_analysis(idea_id)
        return Response({
            "agent_run_id": result.get("agent_run_id"),
            "status": "completed",
            "result": result,
            "mode": "sync_fallback",
        })

    return Response({
        "agent_run_id": str(agent_run.id),
        "status": "pending",
        "mode": "async",
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

    response = {
        "agent_run_id": str(run.id),
        "idea_id": run.idea_id,
        "status": run.status,
        "execution_log": run.execution_log or [],
        "critique": run.critique or {},
        "confidence": getattr(run, "analysis_confidence", None),
    }

    if run.status == "completed":
        analysis = IdeaAnalysis.objects(idea_id=run.idea_id).order_by("-created_at").first()
        response["result"] = StartupAnalysisService.build_run_response(run, analysis=analysis)

    return Response(response)
