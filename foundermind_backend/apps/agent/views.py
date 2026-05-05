from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import StartupAnalysisService
from apps.agent.tasks import run_startup_analysis
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea


@api_view(["POST"])
def start_analysis(request):
    idea_id = request.data.get("idea_id")
    force = bool(request.data.get("force"))
    if not idea_id:
        return Response({"error": "Missing idea_id"}, status=400)

    latest_finished_run = (
        AgentRun.objects(
            idea_id=idea_id,
            status__nin=["pending", "running"],
        )
        .order_by("-created_at")
        .first()
    )

    if not force:
        latest_analysis = (
            IdeaAnalysis.objects(run_id=str(latest_finished_run.id)).order_by("-created_at").first()
            if latest_finished_run
            else None
        )

        if latest_finished_run and latest_finished_run.status == "awaiting_clarification":
            return Response({
                "agent_run_id": str(latest_finished_run.id),
                "status": "awaiting_clarification",
                "clarification_questions": latest_finished_run.clarification_questions or [],
                "mode": "cached",
            })

        if latest_finished_run and latest_finished_run.status in StartupAnalysisService.RESULT_AVAILABLE_STATUSES:
            response = {
                "agent_run_id": str(latest_finished_run.id),
                "status": latest_finished_run.status,
                "result": StartupAnalysisService.build_run_response(
                    latest_finished_run,
                    analysis=latest_analysis,
                ),
                "mode": "cached",
            }
            return Response(response)

        if latest_finished_run and latest_finished_run.status == "failed":
            return Response({
                "agent_run_id": str(latest_finished_run.id),
                "status": "failed",
                "critique": latest_finished_run.critique or {},
                "mode": "cached",
            })

    agent_run = AgentRun(
        idea_id=idea_id,
        status="pending",
        execution_log=(
            StartupAnalysisService.build_resume_execution_log(latest_finished_run)
            if force and latest_finished_run and latest_finished_run.status in StartupAnalysisService.RESUMABLE_STATUSES
            else []
        ),
    )
    agent_run.save()

    try:
        run_startup_analysis.delay(str(agent_run.id))
    except Exception:
        eager_result = run_startup_analysis.apply(args=[str(agent_run.id)])
        task_result = (
            eager_result.result
            if isinstance(eager_result.result, dict)
            else {"error": str(eager_result.result)}
        )
        agent_run.reload()

        response = {
            "agent_run_id": str(agent_run.id),
            "status": agent_run.status,
            "mode": "sync_fallback",
        }

        if agent_run.status in StartupAnalysisService.RESULT_AVAILABLE_STATUSES:
            analysis = StartupAnalysisService._get_analysis_for_run(agent_run)
            response["result"] = StartupAnalysisService.build_run_response(
                agent_run,
                analysis=analysis,
            )
        elif task_result.get("error"):
            response["error"] = task_result["error"]
            response["critique"] = agent_run.critique or {}

        return Response(response)

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
        "iterations_used": run.iterations_used or 0,
        "convergence_reason": run.convergence_reason,
        "iteration_scores": run.iteration_scores or [],
    }

    if run.status == "awaiting_clarification":
        response["clarification_questions"] = run.clarification_questions or []

    if run.status in StartupAnalysisService.RESULT_AVAILABLE_STATUSES:
        analysis = StartupAnalysisService._get_analysis_for_run(run)
        response["result"] = StartupAnalysisService.build_run_response(run, analysis=analysis)

    return Response(response)


@api_view(["POST"])
def submit_clarification(request, run_id):
    agent_run = AgentRun.objects(id=run_id).first()
    if not agent_run:
        return Response({"error": "Agent run not found"}, status=404)

    if agent_run.status != "awaiting_clarification":
        return Response(
            {"error": "This run is not awaiting clarification"},
            status=400,
        )

    answers = request.data.get("answers", {})
    if not answers or not isinstance(answers, dict):
        return Response({"error": "At least one answer is required"}, status=400)

    # Filter out empty answers
    answers = {k: v for k, v in answers.items() if isinstance(v, str) and v.strip()}
    if not answers:
        return Response({"error": "At least one non-empty answer is required"}, status=400)

    # Save answers
    agent_run.clarification_answers = answers
    agent_run.save()

    # Build enriched description
    original_desc = agent_run.original_description or ""
    questions = agent_run.clarification_questions or []

    enrichment_parts = []
    for idx_str, answer in sorted(answers.items(), key=lambda x: x[0]):
        try:
            idx = int(idx_str)
            if idx < len(questions):
                enrichment_parts.append(f"Q: {questions[idx]}\nA: {answer.strip()}")
        except (ValueError, IndexError):
            continue

    enriched_description = original_desc
    if enrichment_parts:
        clarification_block = "\n\n".join(enrichment_parts)
        enriched_description = f"{original_desc}\n\nAdditional context:\n{clarification_block}"

    # Update the Idea object with enriched description
    idea_obj = Idea.objects(id=agent_run.idea_id).first()
    if idea_obj:
        idea_obj.description = enriched_description
        idea_obj.save()

    # Reset execution log and re-queue analysis
    agent_run.status = "running"
    agent_run.execution_log = []
    agent_run.save()

    try:
        run_startup_analysis.delay(str(agent_run.id))
    except Exception:
        run_startup_analysis.apply(args=[str(agent_run.id)])

    return Response({
        "status": "running",
        "run_id": str(agent_run.id),
    })
