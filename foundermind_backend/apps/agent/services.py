from apps.agent.executor import ToolExecutor
from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea
from apps.agent.orchestrator import StartupOrchestrator


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
        orchestrator = StartupOrchestrator()
        execution_data = orchestrator.run(idea_text)

        results = execution_data["results"]
        execution_log = execution_data["execution_log"]
        critique = execution_data["critique"]

        # 3️⃣ Store Analysis Results
        analysis = IdeaAnalysis(
            idea_id=str(idea_id),
            similar_startups=results.get("similar_startups"),
            market_data=results.get("market_data"),
            market_quantitative_model=results.get("market_quantitative_model"),
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
            status="completed",
            critique=critique,
            idea_type=execution_data.get("idea_type"),
            classification_confidence=execution_data.get("classification_confidence"),
            analysis_confidence=execution_data.get("analysis_confidence"),
            overall_score=critique.get("overall_score"),
        )
        agent_run.save()

        return {
            "idea_id": str(idea_id),
            "analysis_id": str(analysis.id),
            "agent_run_id": str(agent_run.id),
            "idea_type": execution_data.get("idea_type"),
            "classification_confidence": execution_data.get("classification_confidence"),
            "analysis_confidence": execution_data.get("analysis_confidence"),
            "results": results,
            "execution_log": execution_log,
            "critique": critique
        }

    @staticmethod
    def build_run_response(agent_run, analysis=None):
        if analysis is None and agent_run:
            analysis = IdeaAnalysis.objects(idea_id=agent_run.idea_id).order_by("-created_at").first()

        critique = agent_run.critique or {}

        return {
            "idea_id": agent_run.idea_id,
            "agent_run_id": str(agent_run.id),
            "idea_type": agent_run.idea_type or "general",
            "classification_confidence": agent_run.classification_confidence or 0,
            "analysis_confidence": agent_run.analysis_confidence or 0,
            "results": {
                "similar_startups": getattr(analysis, "similar_startups", None),
                "market_data": getattr(analysis, "market_data", None),
                "market_quantitative_model": getattr(analysis, "market_quantitative_model", None),
                "funding_info": getattr(analysis, "funding_info", None),
                "monetization": getattr(analysis, "monetization", None),
                "customer_profile": getattr(analysis, "customer_profile", None),
                "tech_stack": getattr(analysis, "tech_stack", None),
                "swot": getattr(analysis, "swot", None),
            },
            "execution_log": agent_run.execution_log or [],
            "critique": {
                "overall_score": critique.get("overall_score", 0),
                "section_scores": critique.get("section_scores", {}),
                "issues_found": critique.get("issues_found", []),
                "rerun_tools": critique.get("rerun_tools", []),
                "needs_rerun": critique.get("needs_rerun", False),
            },
        }
