from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import StartupAnalysisService
from apps.agent.tasks import (
    CANCELLABLE_RUN_STATUSES,
    _mark_run_cancelled,
    execute_analysis_stage,
    prepare_analysis_stage,
    run_startup_analysis,
    retry_section_task,
    _is_cooldown_active,
    _SECTION_TO_TOOL,
    _get_plan_tool_names,
)
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea


def _get_resume_iteration(agent_run: AgentRun) -> int:
    latest_iteration = 0
    for entry in agent_run.execution_log or []:
        iteration = entry.get("iteration")
        if isinstance(iteration, int) and iteration > latest_iteration:
            latest_iteration = iteration
    return latest_iteration


def _resume_cancelled_run(agent_run: AgentRun):
    pipeline_state = dict(agent_run.pipeline_state or {})
    has_execution_plan = bool(pipeline_state.get("idea_text")) and isinstance(
        pipeline_state.get("plan"),
        dict,
    )

    agent_run.status = "running"
    agent_run.save()

    if has_execution_plan:
        iteration = _get_resume_iteration(agent_run)
        try:
            execute_analysis_stage.delay(
                str(agent_run.id),
                iteration=iteration,
                rerun_tools=None,
            )
        except Exception:
            execute_analysis_stage.apply(
                args=[str(agent_run.id)],
                kwargs={
                    "iteration": iteration,
                    "rerun_tools": None,
                },
            )
        return

    try:
        prepare_analysis_stage.delay(str(agent_run.id))
    except Exception:
        prepare_analysis_stage.apply(args=[str(agent_run.id)])


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

        if latest_finished_run and latest_finished_run.status == "cancelled":
            return Response({
                "agent_run_id": str(latest_finished_run.id),
                "status": "cancelled",
                "critique": latest_finished_run.critique or {},
                "execution_log": latest_finished_run.execution_log or [],
                "mode": "cached",
            })

    if (
        force
        and latest_finished_run
        and latest_finished_run.status == "cancelled"
        and StartupAnalysisService.is_resumable_run(latest_finished_run)
    ):
        _resume_cancelled_run(latest_finished_run)
        latest_finished_run.reload()
        return Response({
            "agent_run_id": str(latest_finished_run.id),
            "status": "running",
            "mode": "async",
            "execution_log": latest_finished_run.execution_log or [],
        })

    resumable_run = (
        latest_finished_run
        if force
        and latest_finished_run
        and StartupAnalysisService.is_resumable_run(latest_finished_run)
        and latest_finished_run.status != "cancelled"
        else None
    )

    agent_run = AgentRun(
        idea_id=idea_id,
        status="pending",
        execution_log=(
            StartupAnalysisService.build_resume_execution_log(resumable_run)
            if resumable_run
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
        elif agent_run.status == "cancelled":
            response["execution_log"] = agent_run.execution_log or []
            response["critique"] = agent_run.critique or {}
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
        "section_states": run.section_states or {},
        "critique": run.critique or {},
        "confidence": getattr(run, "analysis_confidence", None),
        "iterations_used": run.iterations_used or 0,
        "convergence_reason": run.convergence_reason,
        "iteration_scores": run.iteration_scores or [],
    }

    if run.status == "awaiting_clarification":
        response["clarification_questions"] = run.clarification_questions or []

    if run.status in StartupAnalysisService.RESULT_AVAILABLE_STATUSES:
        response["section_states"] = (
            run.section_states
            or StartupAnalysisService.compute_section_states(run)
        )
        analysis = StartupAnalysisService._get_analysis_for_run(run)
        response["result"] = StartupAnalysisService.build_run_response(run, analysis=analysis)

    return Response(response)


@api_view(["POST"])
def stop_analysis(request, run_id):
    action = (request.data.get("action") or "").strip()
    if action not in {"edit", "new_idea", "terminate"}:
        return Response({"error": "Invalid stop action"}, status=400)

    agent_run = AgentRun.objects(id=run_id).first()
    if not agent_run:
        return Response({"error": "Agent run not found"}, status=404)

    idea_obj = Idea.objects(id=agent_run.idea_id).first()
    allowed_stop_statuses = CANCELLABLE_RUN_STATUSES | {"cancelled"}

    if action != "terminate" and agent_run.status not in allowed_stop_statuses:
        return Response({"error": "This analysis can no longer be stopped"}, status=409)

    if action != "terminate" and not idea_obj:
        return Response({"error": "Idea not found"}, status=404)

    if agent_run.status in CANCELLABLE_RUN_STATUSES:
        _mark_run_cancelled(agent_run, action=action)
        agent_run.reload()

    if action == "terminate":
        idea_id = agent_run.idea_id
        StartupAnalysisService.delete_analysis_artifacts_for_idea(idea_id)
        if idea_obj:
            idea_obj.delete()
        return Response({
            "status": "terminated",
            "idea_id": idea_id,
        })

    return Response({
        "status": "cancelled",
        "agent_run_id": str(agent_run.id),
        "idea_id": agent_run.idea_id,
        "title": getattr(idea_obj, "title", ""),
        "description": getattr(idea_obj, "description", "") or "",
    })


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


@api_view(["POST"])
def retry_section(request, run_id):
    section_key = (request.data.get("section_key") or "").strip()
    if not section_key:
        return Response({"error": "Missing section_key"}, status=400)

    agent_run = AgentRun.objects(id=run_id).first()
    if not agent_run:
        return Response({"error": "Agent run not found"}, status=404)

    # Only allow retry on runs that have finished analysis
    if agent_run.status not in StartupAnalysisService.RESULT_AVAILABLE_STATUSES:
        return Response(
            {"error": f"Cannot retry sections on a run with status '{agent_run.status}'"},
            status=409,
        )

    # Validate section_key maps to a known tool
    tool_name = _SECTION_TO_TOOL.get(section_key)
    if not tool_name:
        return Response(
            {"error": f"Unknown section key: {section_key}"},
            status=400,
        )

    # Validate tool was in the original planner plan
    plan_tools = _get_plan_tool_names(agent_run)
    if tool_name not in plan_tools:
        return Response(
            {
                "error": (
                    f"Tool '{tool_name}' for section '{section_key}' was not "
                    f"in the original planner plan. Retry is only allowed for "
                    f"planner-approved tools."
                ),
            },
            status=403,
        )

    # Check cooldown
    current_states = dict(agent_run.section_states or {})
    existing_state = current_states.get(section_key, {})
    if _is_cooldown_active(existing_state):
        return Response({
            "status": "cooldown_active",
            "section_key": section_key,
            "section_states": current_states,
            "cooldown_until": existing_state.get("cooldown_until"),
        })

    # Dispatch the retry task
    try:
        retry_section_task.delay(str(agent_run.id), section_key)
    except Exception:
        retry_section_task.apply(args=[str(agent_run.id), section_key])

    # Immediately return the running state
    agent_run.reload()
    return Response({
        "status": "running",
        "section_key": section_key,
        "agent_run_id": str(agent_run.id),
        "section_states": agent_run.section_states or {},
    })
