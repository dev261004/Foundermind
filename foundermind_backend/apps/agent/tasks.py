import datetime

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.conf import settings

from apps.agent.executor import ToolExecutor
from apps.agent.idea_quality import check_idea_quality, refine_description
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.agent.orchestrator import StartupOrchestrator
from apps.agent.planner import PlannerAgent
from apps.agent.reporter import ReporterAgent
from apps.agent.services import StartupAnalysisService
from apps.analytics.drift_detector import DriftDetector
from apps.analytics.tool_drift_detector import ToolDriftDetector
from apps.ideas.models import Idea
from core.exceptions import LLMQuotaExhaustedError

PREPARE_ANALYSIS_SOFT_TIMEOUT_SECONDS = 240
PREPARE_ANALYSIS_HARD_TIMEOUT_SECONDS = 300
EXECUTE_ANALYSIS_SOFT_TIMEOUT_SECONDS = 420
EXECUTE_ANALYSIS_HARD_TIMEOUT_SECONDS = 480
REVIEW_ANALYSIS_SOFT_TIMEOUT_SECONDS = 240
REVIEW_ANALYSIS_HARD_TIMEOUT_SECONDS = 300
REPORT_ANALYSIS_SOFT_TIMEOUT_SECONDS = 240
REPORT_ANALYSIS_HARD_TIMEOUT_SECONDS = 300
CANCELLABLE_RUN_STATUSES = {"pending", "running", "awaiting_clarification"}
IMMUTABLE_TERMINAL_RUN_STATUSES = {
    "cancelled",
    "completed",
    "failed",
    "partial",
    "quota_exhausted",
}


def _timestamp() -> str:
    return datetime.datetime.utcnow().isoformat()


def _format_timeout_window(seconds: int) -> str:
    if seconds % 60 == 0:
        minutes = seconds // 60
        suffix = "" if minutes == 1 else "s"
        return f"{minutes} minute{suffix}"
    return f"{seconds} seconds"


def _build_timeout_message(stage_label: str, seconds: int) -> str:
    return (
        f"{stage_label.capitalize()} stage timed out after "
        f"{_format_timeout_window(seconds)}"
    )


def _is_cancelled(run_id: str) -> bool:
    agent_run = AgentRun.objects(id=run_id).only("status").first()
    return bool(agent_run and agent_run.status == "cancelled")


def _build_cancellation_entry(action: str) -> dict:
    action_messages = {
        "edit": "Analysis stopped so you can edit the idea and rerun it.",
        "new_idea": "Analysis stopped so you can submit a different idea.",
        "terminate": "Analysis stopped and is being permanently deleted.",
    }
    return {
        "type": "user_cancelled",
        "status": "cancelled",
        "action": action,
        "message": action_messages.get(action, "Analysis stopped by user."),
        "timestamp": _timestamp(),
    }


def _mark_run_cancelled(agent_run: AgentRun, *, action: str):
    agent_run.reload()
    if agent_run.status == "cancelled":
        return

    current_log = list(agent_run.execution_log or [])
    current_log.append(_build_cancellation_entry(action))

    critique = dict(agent_run.critique or {})
    critique["message"] = "Analysis stopped by user."
    critique["cancelled_action"] = action

    agent_run.execution_log = current_log
    agent_run.status = "cancelled"
    agent_run.critique = critique
    agent_run.save()


def _resolve_next_run_status(agent_run: AgentRun, requested_status: str) -> str:
    current_status = agent_run.status
    if current_status in IMMUTABLE_TERMINAL_RUN_STATUSES:
        return current_status
    return requested_status


def _abort_if_cancelled(run_id: str):
    if _is_cancelled(run_id):
        return {"status": "cancelled"}
    return None


def _get_agent_run(run_id: str) -> AgentRun:
    agent_run = AgentRun.objects(id=run_id).first()
    if not agent_run:
        raise ValueError("Agent run not found")
    return agent_run


def _get_idea(agent_run: AgentRun) -> Idea:
    idea_obj = Idea.objects(id=agent_run.idea_id).first()
    if not idea_obj:
        raise ValueError("Idea not found")
    return idea_obj


def _should_run_inline(task) -> bool:
    request = getattr(task, "request", None)
    return bool(
        getattr(request, "called_directly", False)
        or getattr(request, "is_eager", False)
    )


def _build_log_callbacks(agent_run: AgentRun):
    def persist_log_entry(entry: dict):
        _save_execution_entry(agent_run, entry, status="running")

    def update_log_entry(
        *,
        updates: dict,
        tool_name: str | None = None,
        agent_name: str | None = None,
    ):
        _update_execution_entry(
            agent_run,
            updates=updates,
            status="running",
            tool_name=tool_name,
            agent_name=agent_name,
        )

    return persist_log_entry, update_log_entry


def _load_pipeline_state(agent_run: AgentRun) -> dict:
    return dict(agent_run.pipeline_state or {})


def _save_pipeline_state(agent_run: AgentRun, **updates) -> dict:
    agent_run.reload()
    pipeline_state = dict(agent_run.pipeline_state or {})
    pipeline_state.update(updates)
    agent_run.pipeline_state = pipeline_state
    agent_run.save()
    return pipeline_state


def _restore_enriched_results(agent_run: AgentRun, orchestrator: StartupOrchestrator) -> dict:
    results = StartupAnalysisService._build_results_from_execution_log(
        agent_run.execution_log or []
    )
    return orchestrator.enrich_results(results)


def _enqueue_stage(task, *args, **kwargs):
    try:
        task.delay(*args, **kwargs)
        return {"status": "running"}
    except Exception:
        eager_result = task.apply(args=args, kwargs=kwargs)
        if isinstance(getattr(eager_result, "result", None), dict):
            return eager_result.result
        return {"status": "running"}


def _queue_or_run_execute(
    run_id: str,
    *,
    iteration: int,
    rerun_tools: list[str] | None = None,
    inline: bool,
):
    if inline:
        return _run_execute_stage(
            run_id,
            iteration=iteration,
            rerun_tools=rerun_tools,
            inline=True,
        )
    return _enqueue_stage(
        execute_analysis_stage,
        run_id,
        iteration=iteration,
        rerun_tools=rerun_tools,
    )


def _queue_or_run_review(run_id: str, *, iteration: int, inline: bool):
    if inline:
        return _run_review_stage(run_id, iteration=iteration, inline=True)
    return _enqueue_stage(review_analysis_stage, run_id, iteration=iteration)


def _queue_or_run_report(run_id: str, *, inline: bool):
    if inline:
        return _run_report_stage(run_id)
    return _enqueue_stage(report_analysis_stage, run_id)


def _mark_stage_failure(run_id: str, error_message: str):
    agent_run = _get_agent_run(run_id)
    _mark_run_failed(agent_run, error_message)
    agent_run.reload()
    if agent_run.status == "cancelled":
        return {
            "status": "cancelled",
        }
    return {
        "status": "failed",
        "error": error_message,
    }


def _reset_run_for_pipeline(agent_run: AgentRun):
    agent_run.status = "running"
    agent_run.critique = None
    agent_run.report_summary = None
    agent_run.idea_type = None
    agent_run.classification_confidence = None
    agent_run.analysis_confidence = None
    agent_run.overall_score = None
    agent_run.weighted_score = None
    agent_run.iterations_used = None
    agent_run.convergence_reason = None
    agent_run.iteration_scores = []
    agent_run.pipeline_state = {}
    agent_run.models_used = {}
    agent_run.save()


def _save_execution_entry(agent_run: AgentRun, entry: dict, status: str = "running"):
    agent_run.reload()
    current_log = list(agent_run.execution_log or [])
    current_log.append(dict(entry))

    current_models = dict(agent_run.models_used or {})
    model_key = entry.get("tool") or entry.get("agent")
    if model_key and entry.get("model_used"):
        current_models[model_key] = entry["model_used"]

    agent_run.execution_log = current_log
    agent_run.models_used = current_models
    agent_run.status = _resolve_next_run_status(agent_run, status)
    agent_run.save()


def _update_execution_entry(
    agent_run: AgentRun,
    *,
    updates: dict,
    status: str = "running",
    tool_name: str | None = None,
    agent_name: str | None = None,
    current_status: str = "started",
):
    agent_run.reload()
    current_log = list(agent_run.execution_log or [])

    for index in range(len(current_log) - 1, -1, -1):
        entry = current_log[index]
        if entry.get("status") != current_status:
            continue
        if tool_name and entry.get("tool") != tool_name:
            continue
        if agent_name and entry.get("agent") != agent_name:
            continue

        updated_entry = {**entry, **updates}
        current_log[index] = updated_entry

        current_models = dict(agent_run.models_used or {})
        model_key = updated_entry.get("tool") or updated_entry.get("agent")
        if model_key and updated_entry.get("model_used"):
            current_models[model_key] = updated_entry["model_used"]

        agent_run.execution_log = current_log
        agent_run.models_used = current_models
        agent_run.status = _resolve_next_run_status(agent_run, status)
        agent_run.save()
        return updated_entry

    fallback_entry = {
        **({"tool": tool_name} if tool_name else {}),
        **({"agent": agent_name} if agent_name else {}),
        **updates,
    }
    _save_execution_entry(agent_run, fallback_entry, status=status)
    return fallback_entry


def _upsert_analysis_snapshot(agent_run: AgentRun, results: dict, report_summary: str | None = None, action_plan: dict | None = None):
    analysis = IdeaAnalysis.objects(run_id=str(agent_run.id)).first()
    if not analysis:
        analysis = IdeaAnalysis(
            idea_id=agent_run.idea_id,
            run_id=str(agent_run.id),
        )

    analysis.similar_startups = results.get("similar_startups") or []
    analysis.market_data = results.get("market_data")
    analysis.market_quantitative_model = results.get("market_quantitative_model")
    analysis.funding_info = results.get("funding_info") or []
    analysis.monetization = results.get("monetization") or []
    analysis.customer_profile = results.get("customer_profile")
    analysis.tech_stack = results.get("tech_stack")
    analysis.swot = results.get("swot")
    if report_summary is not None:
        analysis.report_summary = report_summary
    if action_plan is not None:
        analysis.action_plan = action_plan
    analysis.save()
    return analysis


def _mark_run_failed(
    agent_run: AgentRun,
    error_message: str,
    critique: dict | None = None,
):
    agent_run.reload()
    if agent_run.status == "cancelled":
        return
    _save_execution_entry(agent_run, {
        "type": "pipeline_error",
        "status": "failed",
        "error": error_message,
        "timestamp": _timestamp(),
    }, status="failed")
    agent_run.reload()
    agent_run.status = "failed"
    agent_run.critique = {
        **(critique or {}),
        "error": error_message,
    }
    agent_run.save()


def _mark_run_quota_exhausted(
    agent_run: AgentRun,
    error: LLMQuotaExhaustedError,
    critique: dict | None = None,
    analysis_confidence: float | None = None,
    weighted_score: float | None = None,
):
    agent_run.reload()
    if agent_run.status == "cancelled":
        return
    _save_execution_entry(agent_run, {
        "type": "quota_exhausted",
        "status": "failed",
        "error": str(error),
        "error_type": type(error).__name__,
        "primary_model": error.primary_model,
        "fallback_model": error.fallback_model,
        "timestamp": _timestamp(),
    }, status="quota_exhausted")
    agent_run.reload()
    agent_run.status = "quota_exhausted"
    agent_run.critique = {
        **(critique or {}),
        "error": str(error),
        "message": "Analysis paused — quota reached. Retry after rate limit resets.",
    }
    if analysis_confidence is not None:
        agent_run.analysis_confidence = analysis_confidence
    if weighted_score is not None:
        agent_run.weighted_score = weighted_score
    agent_run.save()


def _tool_failures_present(agent_run: AgentRun) -> bool:
    latest_tool_status = {}
    for entry in agent_run.execution_log or []:
        tool = entry.get("tool")
        status = entry.get("status")
        if not tool:
            continue
        if status == "success":
            latest_tool_status[tool] = "success"
        elif status == "failed":
            latest_tool_status[tool] = "failed"
        elif status == "skipped" and entry.get("reason") == "checkpoint_found":
            latest_tool_status[tool] = "success"
    return any(status == "failed" for status in latest_tool_status.values())


def _run_prepare_stage(run_id: str, *, inline: bool):
    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    agent_run = _get_agent_run(run_id)
    idea_obj = _get_idea(agent_run)
    persist_log_entry, update_log_entry = _build_log_callbacks(agent_run)

    title = idea_obj.title
    raw_description = (getattr(idea_obj, "description", None) or "").strip()
    truncated_desc = (
        raw_description[:settings.IDEA_DESCRIPTION_AI_MAX_CHARS]
        if raw_description
        else ""
    )
    idea_text = f"{title}\n\n{truncated_desc}" if truncated_desc else title

    agent_run.original_description = raw_description
    agent_run.quality_missing_signals = []
    agent_run.clarification_questions = []
    agent_run.save()

    orchestrator = StartupOrchestrator()
    planner = PlannerAgent()

    persist_log_entry({
        "agent": "quality_check",
        "status": "started",
        "message": "Evaluating description quality before analysis.",
        "timestamp": _timestamp(),
    })

    quality_result = check_idea_quality(title, truncated_desc)
    quality_score = quality_result.get("total_score", 2)

    if quality_score < settings.IDEA_QUALITY_MIN_SCORE:
        questions = quality_result.get("suggested_questions", [])
        missing = quality_result.get("missing_signals", [])

        update_log_entry(
            agent_name="quality_check",
            updates={
                "type": "quality_check",
                "status": "awaiting_clarification",
                "quality_score": quality_score,
                "missing_signals": missing,
                "questions_count": len(questions),
                "message": (
                    f"Description quality score {quality_score}/4 is below "
                    "threshold. Requesting user clarification."
                ),
                "completed_at": _timestamp(),
            },
        )

        agent_run.reload()
        agent_run.quality_score = quality_score
        agent_run.quality_missing_signals = missing
        agent_run.clarification_questions = questions
        agent_run.status = "awaiting_clarification"
        agent_run.save()
        return {
            "status": "awaiting_clarification",
            "questions": questions,
        }

    update_log_entry(
        agent_name="quality_check",
        updates={
            "type": "quality_check",
            "status": "completed",
            "quality_score": quality_score,
            "missing_signals": quality_result.get("missing_signals", []),
            "message": (
                f"Description quality score {quality_score}/4 — sufficient "
                "for analysis."
            ),
            "completed_at": _timestamp(),
        },
    )

    persist_log_entry({
        "agent": "idea_refinement",
        "status": "started",
        "message": "Refining the idea description for analysis.",
        "timestamp": _timestamp(),
    })

    refined = refine_description(title, truncated_desc)
    agent_run.reload()
    agent_run.quality_score = quality_score
    agent_run.refined_description = refined
    agent_run.quality_missing_signals = quality_result.get("missing_signals", [])
    agent_run.clarification_questions = []
    agent_run.save()

    if refined and refined.strip() and refined != raw_description:
        idea_text = f"{title}\n\n{refined[:settings.IDEA_DESCRIPTION_AI_MAX_CHARS]}"

    update_log_entry(
        agent_name="idea_refinement",
        updates={
            "type": "idea_refinement",
            "status": "completed",
            "quality_score": quality_score,
            "original_length": len(raw_description),
            "refined_length": len(refined),
            "message": (
                f"Description refined ({len(raw_description)} → "
                f"{len(refined)} chars)."
            ),
            "completed_at": _timestamp(),
        },
    )

    persist_log_entry({
        "agent": "idea_classification",
        "status": "started",
        "message": "Classifying the idea before planning.",
        "timestamp": _timestamp(),
    })

    try:
        classification = orchestrator.classify_idea(idea_text)
        update_log_entry(
            agent_name="idea_classification",
            updates={
                "type": "idea_classification",
                "status": "completed",
                "idea_type": classification["idea_type"],
                "classification_source": classification["classification_source"],
                "classification_confidence": classification["classification_confidence"],
                "weights_used": classification["weights"],
                "model_used": classification["model_used"],
                "message": (
                    f"Classified as {classification['idea_type']} using "
                    f"{classification['classification_source']}."
                ),
                "completed_at": _timestamp(),
            },
        )
    except Exception as exc:
        classification = {
            "idea_type": "general",
            "classification_confidence": 0.6,
            "classification_source": "rule_based_fallback",
            "weights": orchestrator.get_weights_for_idea_type("general"),
            "model_used": None,
        }
        update_log_entry(
            agent_name="idea_classification",
            updates={
                "type": "idea_classification",
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "idea_type": "general",
                "classification_source": "rule_based_fallback",
                "classification_confidence": 0.6,
                "weights_used": classification["weights"],
                "message": "Classification failed, using the rule-based fallback.",
                "completed_at": _timestamp(),
            },
        )

    persist_log_entry({
        "agent": "planner",
        "status": "started",
        "message": "Creating the execution plan.",
        "timestamp": _timestamp(),
    })

    try:
        plan, planner_model = planner.create_plan(idea_text)
        update_log_entry(
            agent_name="planner",
            updates={
                "status": "completed",
                "model_used": planner_model,
                "plan_steps": len(plan.get("steps", [])),
                "message": (
                    "Planner created a "
                    f"{len(plan.get('steps', []))}-step execution plan."
                ),
                "completed_at": _timestamp(),
            },
        )
    except LLMQuotaExhaustedError as exc:
        update_log_entry(
            agent_name="planner",
            updates={
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "message": "Planner exhausted available LLM quota.",
                "completed_at": _timestamp(),
            },
        )
        _mark_run_quota_exhausted(agent_run, exc)
        return {
            "status": "quota_exhausted",
            "error": "Analysis paused — quota reached. Retry after rate limit resets.",
        }
    except Exception as exc:
        update_log_entry(
            agent_name="planner",
            updates={
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "message": "Planner failed while creating the execution plan.",
                "completed_at": _timestamp(),
            },
        )
        _mark_run_failed(agent_run, f"Planner failed: {exc}")
        return {
            "status": "failed",
            "error": f"Planner failed: {exc}",
        }

    _save_pipeline_state(
        agent_run,
        idea_text=idea_text,
        plan=plan,
        classification=classification,
    )

    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    return _queue_or_run_execute(
        run_id,
        iteration=0,
        rerun_tools=None,
        inline=inline,
    )


def _run_execute_stage(
    run_id: str,
    *,
    iteration: int = 0,
    rerun_tools: list[str] | None = None,
    inline: bool,
):
    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    agent_run = _get_agent_run(run_id)
    pipeline_state = _load_pipeline_state(agent_run)
    idea_text = pipeline_state.get("idea_text")
    plan = pipeline_state.get("plan") or {}

    if not idea_text:
        raise ValueError("Pipeline state is missing idea_text")
    if not isinstance(plan, dict):
        raise ValueError("Pipeline state is missing a valid plan")

    persist_log_entry, update_log_entry = _build_log_callbacks(agent_run)
    orchestrator = StartupOrchestrator()
    executor = ToolExecutor()
    rerun_tools = list(rerun_tools or []) or None

    execution_plan = (
        orchestrator.build_improvement_plan(plan, rerun_tools)
        if rerun_tools
        else plan
    )
    checkpoints = list(agent_run.execution_log or [])

    execution_data = executor.execute_with_plan(
        idea_text,
        execution_plan,
        log_callback=persist_log_entry,
        update_log_callback=update_log_entry,
        checkpoints=checkpoints,
        use_checkpoints=True,
        force_tools=rerun_tools,
        iteration=iteration,
        should_abort=lambda: _is_cancelled(run_id),
    )
    results = orchestrator.enrich_results(execution_data["results"])
    _upsert_analysis_snapshot(agent_run, results)

    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    return _queue_or_run_review(run_id, iteration=iteration, inline=inline)


def _run_review_stage(run_id: str, *, iteration: int = 0, inline: bool):
    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    agent_run = _get_agent_run(run_id)
    pipeline_state = _load_pipeline_state(agent_run)
    idea_text = pipeline_state.get("idea_text")
    classification = dict(pipeline_state.get("classification") or {})
    if not idea_text:
        raise ValueError("Pipeline state is missing idea_text")

    persist_log_entry, update_log_entry = _build_log_callbacks(agent_run)
    orchestrator = StartupOrchestrator()
    results = _restore_enriched_results(agent_run, orchestrator)

    persist_log_entry({
        "agent": "critic",
        "status": "started",
        "iteration": iteration,
        "message": (
            "Reviewing the collected tool output."
            if iteration == 0
            else f"Reviewing improvement iteration {iteration}."
        ),
        "timestamp": _timestamp(),
    })

    critique, critic_model = orchestrator.review_results(idea_text, results)
    critic_failed = critic_model is None
    average_score = orchestrator.compute_average_section_score(critique)
    update_log_entry(
        agent_name="critic",
        updates={
            "status": "failed" if critic_failed else "completed",
            "iteration": iteration,
            "model_used": critic_model,
            "section_scores": critique.get("section_scores", {}),
            "average_score": average_score,
            "error": (
                critique.get("issues_found", [None])[0]
                if critic_failed
                else None
            ),
            "message": (
                "Critic failed, using the fallback critique."
                if critic_failed
                else f"Critic scored iteration {iteration}."
            ),
            "completed_at": _timestamp(),
        },
    )

    agent_run.reload()
    iteration_scores = list(agent_run.iteration_scores or [])
    iteration_scores = iteration_scores[:iteration]
    iteration_scores.append(average_score)
    iterations_used = iteration

    analysis_confidence = orchestrator.compute_confidence_score(
        critique,
        classification.get("classification_confidence", 0),
    )
    weighted_score = orchestrator.compute_weighted_score(
        critique.get("section_scores", {}),
        classification.get("weights") or {},
    )

    agent_run.critique = critique
    agent_run.idea_type = classification.get("idea_type")
    agent_run.classification_confidence = classification.get(
        "classification_confidence"
    )
    agent_run.analysis_confidence = analysis_confidence
    agent_run.overall_score = critique.get("overall_score")
    agent_run.weighted_score = weighted_score
    agent_run.iterations_used = iterations_used
    agent_run.iteration_scores = iteration_scores
    agent_run.convergence_reason = None
    agent_run.save()

    rerun_tools = orchestrator.get_rerun_tools(critique)
    convergence_reason = orchestrator.get_convergence_reason(critique, rerun_tools)

    if convergence_reason is None and iterations_used >= orchestrator.MAX_IMPROVEMENT_ITERATIONS:
        convergence_reason = "Maximum improvement iterations reached"

    if (
        convergence_reason is None
        and iteration > 0
        and rerun_tools
        and average_score <= iteration_scores[iteration - 1] + orchestrator.SCORE_IMPROVEMENT_EPSILON
    ):
        convergence_reason = "No score improvement detected"

    if convergence_reason:
        persist_log_entry(orchestrator.build_convergence_log(
            iterations_used=iterations_used,
            convergence_reason=convergence_reason,
            iteration_scores=iteration_scores,
        ))

        agent_run.reload()
        agent_run.convergence_reason = convergence_reason
        agent_run.save()
        aborted = _abort_if_cancelled(run_id)
        if aborted:
            return aborted
        return _queue_or_run_report(run_id, inline=inline)

    next_iteration = iteration + 1
    persist_log_entry(orchestrator.build_self_healing_log(
        iteration=next_iteration,
        critique=critique,
        rerun_tools=rerun_tools,
        average_score=average_score,
    ))

    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    return _queue_or_run_execute(
        run_id,
        iteration=next_iteration,
        rerun_tools=rerun_tools,
        inline=inline,
    )


def _run_report_stage(run_id: str):
    aborted = _abort_if_cancelled(run_id)
    if aborted:
        return aborted
    agent_run = _get_agent_run(run_id)
    pipeline_state = _load_pipeline_state(agent_run)
    idea_text = pipeline_state.get("idea_text")
    classification = dict(pipeline_state.get("classification") or {})
    if not idea_text:
        raise ValueError("Pipeline state is missing idea_text")

    persist_log_entry, update_log_entry = _build_log_callbacks(agent_run)
    orchestrator = StartupOrchestrator()
    reporter = ReporterAgent()
    results = _restore_enriched_results(agent_run, orchestrator)

    persist_log_entry({
        "agent": "reporter",
        "status": "started",
        "message": "Synthesizing the founder-facing summary.",
        "timestamp": _timestamp(),
    })

    try:
        reporter_result = reporter.generate_report(
            idea_text,
            results,
            list(agent_run.execution_log or []),
        )
        update_log_entry(
            agent_name="reporter",
            updates={
                "status": "completed",
                "model_used": reporter_result["model_used"],
                "message": "Reporter generated the founder action plan.",
                "completed_at": _timestamp(),
            },
        )
    except LLMQuotaExhaustedError as exc:
        update_log_entry(
            agent_name="reporter",
            updates={
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "message": "Reporter exhausted available LLM quota.",
                "completed_at": _timestamp(),
            },
        )
        _mark_run_quota_exhausted(
            agent_run,
            exc,
            critique=agent_run.critique or {},
            analysis_confidence=agent_run.analysis_confidence,
            weighted_score=agent_run.weighted_score,
        )
        return {
            "status": "quota_exhausted",
            "error": "Analysis paused — quota reached. Retry after rate limit resets.",
        }
    except Exception as exc:
        update_log_entry(
            agent_name="reporter",
            updates={
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "message": "Reporter failed while generating the summary.",
                "completed_at": _timestamp(),
            },
        )
        _mark_run_failed(agent_run, f"Reporter failed: {exc}", critique=agent_run.critique)
        return {
            "status": "failed",
            "error": f"Reporter failed: {exc}",
        }

    _upsert_analysis_snapshot(
        agent_run,
        results,
        report_summary=reporter_result["action_plan"].get("horizon", ""),
        action_plan=reporter_result["action_plan"],
    )

    agent_run.reload()
    final_status = "partial" if _tool_failures_present(agent_run) else "completed"
    agent_run.status = final_status
    agent_run.report_summary = reporter_result["action_plan"].get("horizon", "")
    agent_run.idea_type = classification.get("idea_type")
    agent_run.classification_confidence = classification.get(
        "classification_confidence"
    )
    agent_run.models_used = orchestrator.collect_models_used(
        agent_run.execution_log or []
    )
    agent_run.save()
    return {"status": final_status}


@shared_task(bind=True)
def run_startup_analysis(self, run_id: str):
    agent_run = _get_agent_run(run_id)
    _reset_run_for_pipeline(agent_run)

    try:
        if _should_run_inline(self):
            return _run_prepare_stage(run_id, inline=True)
        return _enqueue_stage(prepare_analysis_stage, run_id)
    except Exception as exc:
        return _mark_stage_failure(
            run_id,
            f"Unexpected pipeline error: {exc}",
        )


@shared_task(
    bind=True,
    soft_time_limit=PREPARE_ANALYSIS_SOFT_TIMEOUT_SECONDS,
    time_limit=PREPARE_ANALYSIS_HARD_TIMEOUT_SECONDS,
)
def prepare_analysis_stage(self, run_id: str):
    inline = _should_run_inline(self)
    try:
        return _run_prepare_stage(run_id, inline=inline)
    except SoftTimeLimitExceeded:
        return _mark_stage_failure(
            run_id,
            _build_timeout_message(
                "prepare analysis",
                PREPARE_ANALYSIS_SOFT_TIMEOUT_SECONDS,
            ),
        )
    except Exception as exc:
        return _mark_stage_failure(
            run_id,
            f"Unexpected prepare analysis stage error: {exc}",
        )


@shared_task(
    bind=True,
    soft_time_limit=EXECUTE_ANALYSIS_SOFT_TIMEOUT_SECONDS,
    time_limit=EXECUTE_ANALYSIS_HARD_TIMEOUT_SECONDS,
)
def execute_analysis_stage(
    self,
    run_id: str,
    iteration: int = 0,
    rerun_tools: list[str] | None = None,
):
    inline = _should_run_inline(self)
    try:
        return _run_execute_stage(
            run_id,
            iteration=iteration,
            rerun_tools=rerun_tools,
            inline=inline,
        )
    except SoftTimeLimitExceeded:
        return _mark_stage_failure(
            run_id,
            _build_timeout_message(
                "execute analysis",
                EXECUTE_ANALYSIS_SOFT_TIMEOUT_SECONDS,
            ),
        )
    except Exception as exc:
        return _mark_stage_failure(
            run_id,
            f"Unexpected execute analysis stage error: {exc}",
        )


@shared_task(
    bind=True,
    soft_time_limit=REVIEW_ANALYSIS_SOFT_TIMEOUT_SECONDS,
    time_limit=REVIEW_ANALYSIS_HARD_TIMEOUT_SECONDS,
)
def review_analysis_stage(self, run_id: str, iteration: int = 0):
    inline = _should_run_inline(self)
    try:
        return _run_review_stage(run_id, iteration=iteration, inline=inline)
    except SoftTimeLimitExceeded:
        return _mark_stage_failure(
            run_id,
            _build_timeout_message(
                "review analysis",
                REVIEW_ANALYSIS_SOFT_TIMEOUT_SECONDS,
            ),
        )
    except Exception as exc:
        return _mark_stage_failure(
            run_id,
            f"Unexpected review analysis stage error: {exc}",
        )


@shared_task(
    bind=True,
    soft_time_limit=REPORT_ANALYSIS_SOFT_TIMEOUT_SECONDS,
    time_limit=REPORT_ANALYSIS_HARD_TIMEOUT_SECONDS,
)
def report_analysis_stage(self, run_id: str):
    try:
        return _run_report_stage(run_id)
    except SoftTimeLimitExceeded:
        return _mark_stage_failure(
            run_id,
            _build_timeout_message(
                "report analysis",
                REPORT_ANALYSIS_SOFT_TIMEOUT_SECONDS,
            ),
        )
    except Exception as exc:
        return _mark_stage_failure(
            run_id,
            f"Unexpected report analysis stage error: {exc}",
        )


@shared_task
def drift_monitor_task():

    result = DriftDetector.auto_recalibrate_all()
    return result


@shared_task
def idea_type_drift_monitor_task():

    result = DriftDetector.auto_recalibrate_per_type()
    return result


@shared_task
def tool_drift_monitor_task():

    result = ToolDriftDetector.detect_tool_drift()
    return result
