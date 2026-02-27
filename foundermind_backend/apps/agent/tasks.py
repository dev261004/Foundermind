from celery import shared_task
from apps.agent.orchestrator import StartupOrchestrator
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea


@shared_task(bind=True)
def run_startup_analysis(self, idea_id: str):

    agent_run = AgentRun.objects(id=idea_id).first()

    try:
        agent_run.update(status="running")

        idea_obj = Idea.objects(id=idea_id).first()
        idea_text = idea_obj.title

        orchestrator = StartupOrchestrator()
        result = orchestrator.run(idea_text)

        # Save analysis
        analysis = IdeaAnalysis(
            idea_id=idea_id,
            similar_startups=result["results"].get("similar_startups"),
            market_data=result["results"].get("market_data"),
            funding_info=result["results"].get("funding_info"),
            monetization=result["results"].get("monetization"),
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
        agent_run.update(status="failed", error=str(e))
        raise