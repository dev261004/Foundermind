import datetime

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

from apps.agent.models import AgentRun, IdeaAnalysis
from apps.agent.orchestrator import StartupOrchestrator
from apps.agent.planner import PlannerAgent
from apps.agent.reporter import ReporterAgent
from apps.agent.executor import ToolExecutor
from apps.analytics.drift_detector import DriftDetector
from apps.analytics.tool_drift_detector import ToolDriftDetector
from apps.ideas.models import Idea
from core.exceptions import LLMQuotaExhaustedError


def _timestamp() -> str:
    return datetime.datetime.utcnow().isoformat()


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
    agent_run.status = status
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
        agent_run.status = status
        agent_run.save()
        return updated_entry

    fallback_entry = {
        **({"tool": tool_name} if tool_name else {}),
        **({"agent": agent_name} if agent_name else {}),
        **updates,
    }
    _save_execution_entry(agent_run, fallback_entry, status=status)
    return fallback_entry


def _upsert_analysis_snapshot(agent_run: AgentRun, results: dict, report_summary: str | None = None):
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
    analysis.save()
    return analysis


def _mark_run_failed(
    agent_run: AgentRun,
    error_message: str,
    critique: dict | None = None,
):
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
    return any(
        entry.get("tool") and entry.get("status") == "failed"
        for entry in (agent_run.execution_log or [])
    )


@shared_task(bind=True, soft_time_limit=300, time_limit=360)
def run_startup_analysis(self, run_id: str):
    agent_run = AgentRun.objects(id=run_id).first()
    if not agent_run:
        raise ValueError("Agent run not found")

    agent_run.status = "running"
    agent_run.save()

    checkpoints = list(agent_run.execution_log or [])

    def persist_log_entry(entry: dict):
        _save_execution_entry(agent_run, entry, status="running")

    def update_log_entry(*, updates: dict, tool_name: str | None = None, agent_name: str | None = None):
        _update_execution_entry(
            agent_run,
            updates=updates,
            status="running",
            tool_name=tool_name,
            agent_name=agent_name,
        )

    idea_obj = Idea.objects(id=agent_run.idea_id).first()
    if not idea_obj:
        raise ValueError("Idea not found")
    idea_text = idea_obj.title

    orchestrator = StartupOrchestrator()
    planner = PlannerAgent()
    executor = ToolExecutor()
    reporter = ReporterAgent()

    try:
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
                    "message": f"Planner created a {len(plan.get('steps', []))}-step execution plan.",
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

        execution_data = executor.execute_with_plan(
            idea_text,
            plan,
            log_callback=persist_log_entry,
            update_log_callback=update_log_entry,
            checkpoints=checkpoints,
            use_checkpoints=True,
        )
        results = orchestrator.enrich_results(execution_data["results"])
        _upsert_analysis_snapshot(agent_run, results)

        persist_log_entry({
            "agent": "critic",
            "status": "started",
            "message": "Reviewing the collected tool output.",
            "timestamp": _timestamp(),
        })

        critique, critic_model = orchestrator.review_results(
            idea_text,
            results,
        )
        critic_failed = critic_model is None
        update_log_entry(
            agent_name="critic",
            updates={
                "status": "failed" if critic_failed else "completed",
                "model_used": critic_model,
                "error": critique.get("issues_found", [None])[0] if critic_failed else None,
                "message": (
                    "Critic failed, using the fallback critique."
                    if critic_failed
                    else "Critic finished scoring the collected sections."
                ),
                "completed_at": _timestamp(),
            },
        )

        analysis_confidence = orchestrator.compute_confidence_score(
            critique,
            classification["classification_confidence"],
        )
        weighted_score = orchestrator.compute_weighted_score(
            critique.get("section_scores", {}),
            classification["weights"],
        )

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
                    "message": "Reporter generated the founder summary.",
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
                critique=critique,
                analysis_confidence=analysis_confidence,
                weighted_score=weighted_score,
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
            _mark_run_failed(agent_run, f"Reporter failed: {exc}", critique=critique)
            return {
                "status": "failed",
                "error": f"Reporter failed: {exc}",
            }

        _upsert_analysis_snapshot(agent_run, results, report_summary=reporter_result["summary"])

        agent_run.reload()
        final_status = "partial" if _tool_failures_present(agent_run) else "completed"
        agent_run.status = final_status
        agent_run.critique = critique
        agent_run.report_summary = reporter_result["summary"]
        agent_run.idea_type = classification["idea_type"]
        agent_run.classification_confidence = classification["classification_confidence"]
        agent_run.analysis_confidence = analysis_confidence
        agent_run.overall_score = critique.get("overall_score")
        agent_run.weighted_score = weighted_score
        agent_run.iterations_used = 0
        agent_run.convergence_reason = "Single-pass execution complete"
        agent_run.models_used = orchestrator.collect_models_used(agent_run.execution_log or [])
        agent_run.save()

        return {"status": final_status}
    except SoftTimeLimitExceeded:
        timeout_message = "Analysis timed out after 5 minutes"
        _mark_run_failed(agent_run, timeout_message)
        return {
            "status": "failed",
            "error": timeout_message,
        }
    except Exception as exc:
        error_message = f"Unexpected pipeline error: {exc}"
        _mark_run_failed(agent_run, error_message)
        return {
            "status": "failed",
            "error": error_message,
        }


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
