from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea
from apps.agent.executor import ToolExecutor


class StartupAnalysisService:
    RESULT_AVAILABLE_STATUSES = {"completed", "partial", "quota_exhausted"}
    RESUMABLE_STATUSES = {"partial", "quota_exhausted", "failed"}

    @staticmethod
    def _get_analysis_for_run(agent_run):
        analysis = IdeaAnalysis.objects(run_id=str(agent_run.id)).order_by("-created_at").first()
        if analysis:
            return analysis
        return IdeaAnalysis.objects(idea_id=agent_run.idea_id).order_by("-created_at").first()

    @staticmethod
    def _build_results_from_execution_log(execution_log):
        results = {
            key: None for key in set(ToolExecutor.RESULT_KEY_MAP.values())
        }
        results["market_quantitative_model"] = None

        reverse_map = ToolExecutor.RESULT_KEY_MAP
        for entry in execution_log or []:
            tool_name = entry.get("tool")
            if not tool_name or entry.get("status") != "success":
                continue
            result_key = reverse_map.get(tool_name)
            if result_key:
                results[result_key] = entry.get("result")
        return results

    @staticmethod
    def build_resume_execution_log(source_run):
        resumable_entries = []
        for entry in source_run.execution_log or []:
            if entry.get("tool") and entry.get("status") == "success":
                resumable_entries.append(entry)
        return resumable_entries

    @staticmethod
    def run_analysis(idea_id: str):
        idea_obj = Idea.objects(id=idea_id).first()
        if not idea_obj:
            raise Exception("Idea not found")

        agent_run = AgentRun(
            idea_id=str(idea_id),
            status="pending",
        )
        agent_run.save()

        from apps.agent.tasks import run_startup_analysis

        run_startup_analysis.apply(args=[str(agent_run.id)])
        agent_run.reload()

        if agent_run.status in StartupAnalysisService.RESULT_AVAILABLE_STATUSES:
            analysis = StartupAnalysisService._get_analysis_for_run(agent_run)
            return StartupAnalysisService.build_run_response(agent_run, analysis=analysis)

        raise Exception(
            agent_run.critique.get("error")
            if agent_run.critique
            else "Analysis failed. Please try again."
        )

    @staticmethod
    def build_run_response(agent_run, analysis=None):
        if analysis is None and agent_run:
            analysis = StartupAnalysisService._get_analysis_for_run(agent_run)

        critique = agent_run.critique or {}
        fallback_results = StartupAnalysisService._build_results_from_execution_log(
            agent_run.execution_log or []
        )

        return {
            "idea_id": agent_run.idea_id,
            "agent_run_id": str(agent_run.id),
            "idea_type": agent_run.idea_type or "general",
            "classification_confidence": agent_run.classification_confidence or 0,
            "analysis_confidence": agent_run.analysis_confidence or 0,
            "report_summary": (
                getattr(analysis, "report_summary", None)
                or getattr(agent_run, "report_summary", None)
            ),
            "models_used": agent_run.models_used or {},
            "results": {
                "similar_startups": getattr(analysis, "similar_startups", fallback_results.get("similar_startups")),
                "market_data": getattr(analysis, "market_data", fallback_results.get("market_data")),
                "market_quantitative_model": getattr(analysis, "market_quantitative_model", fallback_results.get("market_quantitative_model")),
                "funding_info": getattr(analysis, "funding_info", fallback_results.get("funding_info")),
                "monetization": getattr(analysis, "monetization", fallback_results.get("monetization")),
                "customer_profile": getattr(analysis, "customer_profile", fallback_results.get("customer_profile")),
                "tech_stack": getattr(analysis, "tech_stack", fallback_results.get("tech_stack")),
                "swot": getattr(analysis, "swot", fallback_results.get("swot")),
            },
            "execution_log": agent_run.execution_log or [],
            "critique": {
                "overall_score": critique.get("overall_score", 0),
                "section_scores": critique.get("section_scores", {}),
                "issues_found": critique.get("issues_found", []),
                "rerun_tools": critique.get("rerun_tools", []),
                "needs_rerun": critique.get("needs_rerun", False),
                "error": critique.get("error"),
                "message": critique.get("message"),
            },
        }
