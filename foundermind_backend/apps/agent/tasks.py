from celery import shared_task
from apps.agent.orchestrator import StartupOrchestrator
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea


@shared_task(bind=True)
def run_startup_analysis(self, run_id: str):

    agent_run = AgentRun.objects(id=run_id).first()
    if not agent_run:
        raise ValueError("Agent run not found")

    try:
        agent_run.update(status="running")

        def persist_log_entry(entry: dict):
            agent_run.reload()
            current_log = list(agent_run.execution_log or [])
            current_log.append(entry)
            agent_run.update(execution_log=current_log, status="running")

        idea_obj = Idea.objects(id=agent_run.idea_id).first()
        if not idea_obj:
            raise ValueError("Idea not found")
        idea_text = idea_obj.title

        orchestrator = StartupOrchestrator()
        result = orchestrator.run(idea_text, log_callback=persist_log_entry)

        # Save analysis
        analysis = IdeaAnalysis(
            idea_id=agent_run.idea_id,
            similar_startups=result["results"].get("similar_startups"),
            market_data=result["results"].get("market_data"),
            market_quantitative_model=result["results"].get("market_quantitative_model"),
            funding_info=result["results"].get("funding_info"),
            monetization=result["results"].get("monetization"),
            customer_profile=result["results"].get("customer_profile"),
            tech_stack=result["results"].get("tech_stack"),
            swot=result["results"].get("swot"),
        )
        analysis.save()

        critique = result["critique"]

        agent_run.update(
           status="completed",
           execution_log=result["execution_log"],
           critique=critique,

            idea_type=result.get("idea_type"),
            classification_confidence=result.get("classification_confidence"),
            analysis_confidence=result.get("analysis_confidence"),

            overall_score=critique.get("overall_score"),
            weighted_score=result.get("weighted_score"),
            iterations_used=result.get("iterations_used"),
            convergence_reason=result.get("convergence_reason"),
         )

        return {"status": "completed"}

    except Exception as e:
        agent_run.update(
            status="failed",
            critique={"error": str(e)},
        )
        raise

from celery import shared_task
from apps.analytics.drift_detector import DriftDetector


@shared_task
def drift_monitor_task():

    result = DriftDetector.auto_recalibrate_all()
    return result

from celery import shared_task
from apps.analytics.drift_detector import DriftDetector


@shared_task
def idea_type_drift_monitor_task():

    result = DriftDetector.auto_recalibrate_per_type()
    return result

from apps.analytics.tool_drift_detector import ToolDriftDetector


@shared_task
def tool_drift_monitor_task():

    result = ToolDriftDetector.detect_tool_drift()
    return result
