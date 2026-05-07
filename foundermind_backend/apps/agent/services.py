import json

from apps.agent.models import AgentRun, IdeaAnalysis
from apps.ideas.models import Idea
from apps.agent.executor import ToolExecutor
from apps.agent.section_outcomes import classify_tool_outcome


class StartupAnalysisService:
    RESULT_AVAILABLE_STATUSES = {"completed", "partial", "quota_exhausted"}
    RESUMABLE_STATUSES = {"partial", "quota_exhausted", "failed"}
    STRUCTURED_RESULT_KEYS = {
        "similar_startups",
        "funding_info",
        "monetization",
        "customer_profile",
        "tech_stack",
        "swot",
    }

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
                results[result_key] = StartupAnalysisService._deserialize_result(
                    result_key,
                    entry.get("result"),
                )
        return results

    @staticmethod
    def _deserialize_result(result_key: str, value):
        if value is None:
            return None
        if result_key not in StartupAnalysisService.STRUCTURED_RESULT_KEYS:
            return value
        if not isinstance(value, str):
            return value

        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError, ValueError):
            return value

    @staticmethod
    def _build_planned_section_map(agent_run) -> dict[str, str]:
        pipeline_state = dict(agent_run.pipeline_state or {})
        plan = pipeline_state.get("plan") or {}
        section_map: dict[str, str] = {}

        for step in plan.get("steps", []):
            tool_name = step.get("tool")
            section_key = ToolExecutor.RESULT_KEY_MAP.get(tool_name)
            if tool_name and section_key:
                section_map[section_key] = tool_name

        return section_map

    @staticmethod
    def _find_latest_tool_entry(execution_log, tool_name: str):
        for entry in reversed(execution_log or []):
            if entry.get("tool") != tool_name:
                continue

            status = entry.get("status")
            if status == "started":
                continue

            if status == "skipped" and entry.get("reason") == "not_requested_for_rerun":
                continue

            return entry

        return None

    @staticmethod
    def _strip_retry_metadata(section_state: dict) -> dict:
        # Full analysis results should be retryable immediately; cooldowns are only
        # applied after an explicit section retry attempt fails again.
        return {
            **section_state,
            "cooldown_until": None,
            "last_retry_at": None,
            "retry_attempt_id": None,
        }

    @staticmethod
    def compute_section_states(agent_run, results=None):
        current_states = dict(agent_run.section_states or {})
        planned_sections = StartupAnalysisService._build_planned_section_map(agent_run)
        if not planned_sections:
            return current_states

        resolved_results = (
            dict(results)
            if isinstance(results, dict)
            else StartupAnalysisService._build_results_from_execution_log(
                agent_run.execution_log or []
            )
        )

        computed_states: dict[str, dict] = {}
        for section_key, tool_name in planned_sections.items():
            existing_state = current_states.get(section_key)
            if existing_state and existing_state.get("status") == "running":
                computed_states[section_key] = existing_state
                continue

            latest_entry = StartupAnalysisService._find_latest_tool_entry(
                agent_run.execution_log or [],
                tool_name,
            )
            latest_output = resolved_results.get(section_key)

            if latest_entry:
                latest_status = latest_entry.get("status")
                if latest_status == "failed":
                    error_message = (
                        latest_entry.get("error")
                        or latest_entry.get("message")
                        or f"{tool_name} failed."
                    )
                    computed_states[section_key] = StartupAnalysisService._strip_retry_metadata(
                        classify_tool_outcome(
                            tool_name,
                            None,
                            error=Exception(error_message),
                            error_type_name=latest_entry.get("error_type"),
                        )
                    )
                    continue

                if latest_output is None and latest_entry.get("result") is not None:
                    latest_output = StartupAnalysisService._deserialize_result(
                        section_key,
                        latest_entry.get("result"),
                    )

            computed_states[section_key] = StartupAnalysisService._strip_retry_metadata(
                classify_tool_outcome(tool_name, latest_output)
            )

        return computed_states

    @staticmethod
    def sync_section_states(agent_run, results=None):
        agent_run.reload()
        agent_run.section_states = StartupAnalysisService.compute_section_states(
            agent_run,
            results=results,
        )
        agent_run.save()
        return agent_run.section_states

    @staticmethod
    def _normalize_similar_startups(value) -> list[dict]:
        parsed = StartupAnalysisService._deserialize_result("similar_startups", value)
        if not isinstance(parsed, list):
            return []
        return [item for item in parsed if isinstance(item, dict)]

    @staticmethod
    def _normalize_funding_info(value):
        parsed = StartupAnalysisService._deserialize_result("funding_info", value)
        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)][:5]
        return parsed

    @staticmethod
    def build_resume_execution_log(source_run):
        resumable_entries = []
        for entry in source_run.execution_log or []:
            if entry.get("tool") and entry.get("status") == "success":
                resumable_entries.append(entry)
        return resumable_entries

    @staticmethod
    def is_resumable_run(source_run) -> bool:
        if not source_run:
            return False

        if source_run.status in StartupAnalysisService.RESUMABLE_STATUSES:
            return True

        if source_run.status != "cancelled":
            return False

        critique = source_run.critique or {}
        if critique.get("cancelled_action") in {"new_idea", "edit"}:
            return True

        for entry in reversed(source_run.execution_log or []):
            if entry.get("type") != "user_cancelled":
                continue
            return entry.get("action") in {"new_idea", "edit"}

        return False

    @staticmethod
    def delete_analysis_artifacts_for_idea(idea_id: str):
        run_ids = [
            str(run.id)
            for run in AgentRun.objects(idea_id=idea_id).only("id")
        ]

        IdeaAnalysis.objects(idea_id=idea_id).delete()
        if run_ids:
            IdeaAnalysis.objects(run_id__in=run_ids).delete()
        AgentRun.objects(idea_id=idea_id).delete()

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
    def _build_response_results(analysis, fallback_results):
        return {
            "similar_startups": StartupAnalysisService._normalize_similar_startups(
                getattr(analysis, "similar_startups", fallback_results.get("similar_startups"))
            ),
            "market_data": getattr(analysis, "market_data", fallback_results.get("market_data")),
            "market_quantitative_model": getattr(analysis, "market_quantitative_model", fallback_results.get("market_quantitative_model")),
            "funding_info": StartupAnalysisService._normalize_funding_info(
                getattr(analysis, "funding_info", fallback_results.get("funding_info"))
            ),
            "monetization": StartupAnalysisService._deserialize_result(
                "monetization",
                getattr(analysis, "monetization", fallback_results.get("monetization")),
            ),
            "customer_profile": getattr(analysis, "customer_profile", fallback_results.get("customer_profile")),
            "tech_stack": StartupAnalysisService._deserialize_result(
                "tech_stack",
                getattr(analysis, "tech_stack", fallback_results.get("tech_stack")),
            ),
            "swot": StartupAnalysisService._deserialize_result(
                "swot",
                getattr(analysis, "swot", fallback_results.get("swot")),
            ),
        }

    @staticmethod
    def build_run_response(agent_run, analysis=None):
        if analysis is None and agent_run:
            analysis = StartupAnalysisService._get_analysis_for_run(agent_run)

        critique = agent_run.critique or {}
        fallback_results = StartupAnalysisService._build_results_from_execution_log(
            agent_run.execution_log or []
        )

        idea_title = None
        if agent_run.idea_id:
            idea = Idea.objects(id=agent_run.idea_id).only("title").first()
            if idea:
                idea_title = idea.title

        response_results = StartupAnalysisService._build_response_results(
            analysis,
            fallback_results,
        )
        section_states = (
            agent_run.section_states
            or StartupAnalysisService.compute_section_states(
                agent_run,
                results=response_results,
            )
        )

        return {
            "idea_id": agent_run.idea_id,
            "idea_title": idea_title,
            "agent_run_id": str(agent_run.id),
            "idea_type": agent_run.idea_type or "general",
            "classification_confidence": agent_run.classification_confidence or 0,
            "analysis_confidence": agent_run.analysis_confidence or 0,
            "report_summary": (
                getattr(analysis, "report_summary", None)
                or getattr(agent_run, "report_summary", None)
            ),
            "action_plan": (
                getattr(analysis, "action_plan", None)
                or {}
            ),
            "iterations_used": agent_run.iterations_used or 0,
            "convergence_reason": agent_run.convergence_reason,
            "iteration_scores": agent_run.iteration_scores or [],
            "models_used": agent_run.models_used or {},
            "results": response_results,
            "execution_log": agent_run.execution_log or [],
            "section_states": section_states,
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
