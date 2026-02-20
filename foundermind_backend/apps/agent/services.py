from apps.agent.executor import ToolExecutor
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea


class StartupAnalysisService:

    @staticmethod
    def run_analysis(idea_id: str):
        """
        Runs startup analysis for a given idea.
        Stores execution log + analysis results separately.
        """

        # 1️⃣ Fetch Idea Workspace
        idea_obj = Idea.objects(id=idea_id).first()
        if not idea_obj:
            raise Exception("Idea not found")

        idea_text = idea_obj.title

        # 2️⃣ Execute Tools
        executor = ToolExecutor()
        execution_data = executor.execute(idea_text)

        results = execution_data["results"]
        execution_log = execution_data["execution_log"]

        # 3️⃣ Store Analysis Results
        analysis = IdeaAnalysis(
            idea_id=str(idea_id),
            similar_startups=results.get("similar_startups"),
            market_data=results.get("market_data"),
            funding_info=results.get("funding_info"),
            monetization=results.get("monetization"),
            customer_profile=results.get("customer_profile"),
            tech_stack=results.get("tech_stack"),
            swot=results.get("swot"),
        )
        analysis.save()

        # 4️⃣ Store Agent Run Log
        agent_run = AgentRun(
            idea_id=str(idea_id),
            execution_log=execution_log,
            status="completed"
        )
        agent_run.save()

        return {
            "idea_id": str(idea_id),
            "analysis_id": str(analysis.id),
            "agent_run_id": str(agent_run.id),
            "results": results,
            "execution_log": execution_log
        }