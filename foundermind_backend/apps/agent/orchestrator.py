import datetime
import json
import re

from django.conf import settings

from apps.agent.critic import CriticAgent
from apps.agent.executor import ToolExecutor
from apps.agent.planner import PlannerAgent
from apps.agent.reporter import ReporterAgent
from apps.agent.tools.market import extract_structured_market_data
from apps.analytics.market_model import MarketModelEngine
from apps.analytics.models import IdeaTypeWeights
from integrations.gemini_client import call_llm


BASE_IDEA_TYPES = {
    "tech": {
        "similar_startups": 0.15,
        "market_data": 0.20,
        "funding_info": 0.15,
        "monetization": 0.25,
        "swot": 0.25,
    },
    "marketplace": {
        "similar_startups": 0.25,
        "market_data": 0.25,
        "funding_info": 0.20,
        "monetization": 0.15,
        "swot": 0.15,
    },
    "deeptech": {
        "similar_startups": 0.15,
        "market_data": 0.25,
        "funding_info": 0.25,
        "monetization": 0.15,
        "swot": 0.20,
    },
    "general": {
        "similar_startups": 0.20,
        "market_data": 0.20,
        "funding_info": 0.20,
        "monetization": 0.20,
        "swot": 0.20,
    },
}

DEFAULT_CRITIQUE_SECTIONS = (
    "similar_startups",
    "market_data",
    "funding_info",
    "monetization",
    "customer_profile",
    "tech_stack",
    "swot",
)


def rule_based_classification(idea: str) -> str:
    idea_lower = idea.lower()

    if any(keyword in idea_lower for keyword in ["ai", "software", "app", "platform", "saas"]):
        return "tech"
    if any(keyword in idea_lower for keyword in ["marketplace", "ecommerce", "retail"]):
        return "marketplace"
    if any(keyword in idea_lower for keyword in ["biotech", "agriculture", "medical", "pharma"]):
        return "deeptech"
    return "general"


def llm_based_classification(idea: str):
    prompt = f"""
Classify the following startup idea.

Return STRICT JSON only:

{{
  "category": "one_word_category",
  "confidence": 0-1
}}

Startup Idea:
{idea}
"""

    response = call_llm(
        prompt,
        model=settings.AGENT_MODELS["critic"],
        fallback_model=settings.AGENT_MODELS["fallback_gemma"],
    )

    json_match = re.search(r"\{.*\}", response, re.DOTALL)
    if not json_match:
        return None

    parsed = json.loads(json_match.group())
    category = parsed.get("category", "").strip().lower()
    confidence = float(parsed.get("confidence", 0))

    if not category:
        return None

    return category, confidence, getattr(response, "model_used", settings.AGENT_MODELS["critic"])


def hybrid_classify_idea(idea: str):
    llm_result = llm_based_classification(idea)

    if llm_result:
        category, confidence, model_used = llm_result
        if category not in BASE_IDEA_TYPES:
            BASE_IDEA_TYPES[category] = BASE_IDEA_TYPES["general"]
        return category, confidence, "llm", model_used

    fallback_category = rule_based_classification(idea)
    return fallback_category, 0.6, "rule_based", None


class StartupOrchestrator:
    TARGET_OVERALL = 8
    MIN_SECTION_SCORE = 6
    TARGET_WEIGHTED = 7.5
    MAX_IMPROVEMENT_ITERATIONS = 2
    SCORE_IMPROVEMENT_EPSILON = 0.01
    SECTION_TOOL_MAP = {
        "similar_startups": "search_similar_startups",
        "market_data": "search_market_data",
        "funding_info": "search_funding_info",
        "monetization": "generate_monetization_strategy",
        "customer_profile": "generate_customer_profile",
        "tech_stack": "suggest_tech_stack",
        "swot": "generate_swot_analysis",
    }
    TOOL_ORDER = tuple(ToolExecutor.RESULT_KEY_MAP.keys())

    def _timestamp(self) -> str:
        return datetime.datetime.utcnow().isoformat()

    def _append_log(self, log_callback, entry: dict):
        if log_callback:
            log_callback(entry)

    def get_weights_for_idea_type(self, idea_type: str) -> dict:
        weight_doc = IdeaTypeWeights.objects(idea_type=idea_type).first()
        if weight_doc:
            return weight_doc.weights
        return BASE_IDEA_TYPES.get(idea_type, BASE_IDEA_TYPES["general"])

    def classify_idea(self, idea: str, log_callback=None) -> dict:
        idea_type, classification_confidence, source, model_used = hybrid_classify_idea(idea)
        if not idea_type or idea_type not in BASE_IDEA_TYPES:
            idea_type = "general"

        classification_confidence = max(0.0, min(float(classification_confidence or 0), 1.0))
        weights = self.get_weights_for_idea_type(idea_type)

        log_entry = {
            "type": "idea_classification",
            "agent": "idea_classification",
            "status": "completed",
            "idea_type": idea_type,
            "classification_source": source,
            "classification_confidence": classification_confidence,
            "weights_used": weights,
            "timestamp": self._timestamp(),
        }
        if model_used:
            log_entry["model_used"] = model_used
        self._append_log(log_callback, log_entry)

        return {
            "idea_type": idea_type,
            "classification_confidence": classification_confidence,
            "classification_source": source,
            "weights": weights,
            "model_used": model_used,
        }

    def enrich_results(self, results: dict) -> dict:
        enriched = dict(results)
        if not enriched.get("market_data"):
            enriched["market_quantitative_model"] = None
            return enriched

        structured_data = extract_structured_market_data(enriched.get("market_data"))
        if structured_data:
            enriched["market_quantitative_model"] = MarketModelEngine.build_market_model(structured_data)
        else:
            enriched["market_quantitative_model"] = None
        return enriched

    def build_default_critique(self, error_message: str | None = None) -> dict:
        issues = [error_message] if error_message else ["Critic fallback used"]
        return {
            "overall_score": 6,
            "section_scores": {section: self.MIN_SECTION_SCORE for section in DEFAULT_CRITIQUE_SECTIONS},
            "issues_found": issues,
            "rerun_tools": [],
            "needs_rerun": False,
        }

    def apply_rerun_decision(self, critique: dict) -> dict:
        updated = dict(critique or {})
        low_sections = self.get_low_scoring_sections(updated)
        if not low_sections:
            updated["rerun_tools"] = []
            updated["needs_rerun"] = False
            return updated

        rerun_tools = self.get_rerun_tools(updated)
        updated["rerun_tools"] = rerun_tools
        updated["needs_rerun"] = bool(rerun_tools)
        return updated

    def review_results(self, idea: str, results: dict, log_callback=None, iteration: int | None = None):
        critic = CriticAgent()
        try:
            critique, critic_model = critic.review(idea, results)
            critique = self.apply_rerun_decision(critique)
            log_entry = {
                "agent": "critic",
                "status": "completed",
                "model_used": critic_model,
                "timestamp": self._timestamp(),
            }
            if iteration is not None:
                log_entry["iteration"] = iteration
            self._append_log(log_callback, log_entry)
            return critique, critic_model
        except Exception as exc:
            log_entry = {
                "agent": "critic",
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "timestamp": self._timestamp(),
            }
            if iteration is not None:
                log_entry["iteration"] = iteration
            self._append_log(log_callback, log_entry)
            return self.apply_rerun_decision(
                self.build_default_critique(f"Critic failed: {exc}")
            ), None

    def has_failed_tools(self, execution_log: list[dict]) -> bool:
        latest_tool_status = {}
        for entry in execution_log:
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

    def collect_models_used(self, execution_log: list[dict]) -> dict:
        models_used = {}
        for entry in execution_log:
            model_used = entry.get("model_used")
            if not model_used:
                continue
            entry_key = entry.get("tool") or entry.get("agent")
            if entry_key:
                models_used[entry_key] = model_used
        return models_used

    def compute_weighted_score(self, sections, weights):
        return sum(
            weights.get(section, 0) * sections.get(section, 0)
            for section in weights
        )

    def compute_confidence_score(self, critique, classification_confidence):
        overall = critique.get("overall_score", 0)
        sections = critique.get("section_scores", {})

        if not sections:
            return 0.5

        section_avg = sum(sections.values()) / len(sections)
        confidence = (
            0.4 * (overall / 10) +
            0.4 * (section_avg / 10) +
            0.2 * classification_confidence
        )
        return round(confidence, 3)

    def _coerce_score(self, score) -> float:
        try:
            return float(score)
        except (TypeError, ValueError):
            return 0.0

    def compute_average_section_score(self, critique: dict) -> float:
        sections = critique.get("section_scores") or {}
        scores = [self._coerce_score(score) for score in sections.values()]
        if not scores:
            return 0.0
        return round(sum(scores) / len(scores), 2)

    def get_low_scoring_sections(self, critique: dict) -> dict:
        sections = critique.get("section_scores") or {}
        return {
            section: self._coerce_score(score)
            for section, score in sections.items()
            if self._coerce_score(score) < self.MIN_SECTION_SCORE
        }

    def get_rerun_tools(self, critique: dict) -> list[str]:
        requested = set(critique.get("rerun_tools") or [])
        for section in self.get_low_scoring_sections(critique):
            mapped_tool = self.SECTION_TOOL_MAP.get(section)
            if mapped_tool:
                requested.add(mapped_tool)

        valid_tools = set(self.TOOL_ORDER)
        return [
            tool
            for tool in self.TOOL_ORDER
            if tool in requested and tool in valid_tools
        ]

    def get_convergence_reason(self, critique: dict, rerun_tools: list[str] | None = None) -> str | None:
        low_sections = self.get_low_scoring_sections(critique)
        if not low_sections:
            return "All sections above threshold"

        if rerun_tools is None:
            rerun_tools = self.get_rerun_tools(critique)
        if not rerun_tools:
            return "No rerunnable tools available for low-scoring sections"

        return None

    def build_improvement_plan(self, plan: dict, rerun_tools: list[str]) -> dict:
        rerun_set = set(rerun_tools)
        steps = []
        seen_tools = set()

        for step in plan.get("steps", []):
            tool = step.get("tool")
            if tool not in self.TOOL_ORDER:
                continue
            copied_step = dict(step)
            steps.append(copied_step)
            if tool in rerun_set:
                seen_tools.add(tool)

        for tool in self.TOOL_ORDER:
            if tool in rerun_set and tool not in seen_tools:
                steps.append({
                    "tool": tool,
                    "depends_on": [],
                })

        for index, step in enumerate(steps, start=1):
            step["step"] = index

        return {"steps": steps}

    def build_self_healing_log(
        self,
        *,
        iteration: int,
        critique: dict,
        rerun_tools: list[str],
        average_score: float,
    ) -> dict:
        return {
            "type": "self_healing_cycle",
            "status": "started",
            "iteration": iteration,
            "rerun_tools": rerun_tools,
            "low_scoring_sections": self.get_low_scoring_sections(critique),
            "section_scores": critique.get("section_scores", {}),
            "issues_found": critique.get("issues_found", []),
            "average_score": average_score,
            "threshold": self.MIN_SECTION_SCORE,
            "message": f"Critic requested improvement iteration {iteration}.",
            "timestamp": self._timestamp(),
        }

    def build_convergence_log(
        self,
        *,
        iterations_used: int,
        convergence_reason: str,
        iteration_scores: list[float],
    ) -> dict:
        return {
            "type": "convergence",
            "status": "completed",
            "iteration": iterations_used,
            "reason": convergence_reason,
            "iteration_scores": iteration_scores,
            "threshold": self.MIN_SECTION_SCORE,
            "max_iterations": self.MAX_IMPROVEMENT_ITERATIONS,
            "message": convergence_reason,
            "timestamp": self._timestamp(),
        }

    def run(self, idea: str, log_callback=None, checkpoints: list[dict] | None = None):
        execution_log = list(checkpoints or [])

        def append_log(entry: dict):
            execution_log.append(entry)
            if log_callback:
                log_callback(entry)

        classification = self.classify_idea(idea, log_callback=append_log)

        planner = PlannerAgent()
        executor = ToolExecutor()
        reporter = ReporterAgent()

        plan, planner_model = planner.create_plan(idea)
        append_log({
            "agent": "planner",
            "status": "completed",
            "model_used": planner_model,
            "plan_steps": len(plan.get("steps", [])),
            "timestamp": self._timestamp(),
        })

        execution_data = executor.execute_with_plan(
            idea,
            plan,
            log_callback=append_log,
            checkpoints=checkpoints,
            use_checkpoints=True,
            iteration=0,
        )
        results = self.enrich_results(execution_data["results"])
        critique, _ = self.review_results(idea, results, log_callback=append_log, iteration=0)
        iteration_scores = [self.compute_average_section_score(critique)]
        iterations_used = 0
        convergence_reason = "Single-pass execution complete"

        while True:
            rerun_tools = self.get_rerun_tools(critique)
            stop_reason = self.get_convergence_reason(critique, rerun_tools)
            if stop_reason:
                convergence_reason = stop_reason
                break

            if iterations_used >= self.MAX_IMPROVEMENT_ITERATIONS:
                convergence_reason = "Maximum improvement iterations reached"
                break

            previous_average = iteration_scores[-1] if iteration_scores else 0.0
            next_iteration = iterations_used + 1
            append_log(self.build_self_healing_log(
                iteration=next_iteration,
                critique=critique,
                rerun_tools=rerun_tools,
                average_score=previous_average,
            ))

            improvement_plan = self.build_improvement_plan(plan, rerun_tools)
            execution_data = executor.execute_with_plan(
                idea,
                improvement_plan,
                log_callback=append_log,
                checkpoints=execution_log,
                use_checkpoints=True,
                force_tools=rerun_tools,
                iteration=next_iteration,
            )
            results = self.enrich_results(execution_data["results"])
            critique, _ = self.review_results(
                idea,
                results,
                log_callback=append_log,
                iteration=next_iteration,
            )
            current_average = self.compute_average_section_score(critique)
            iteration_scores.append(current_average)
            iterations_used = next_iteration

            if (
                current_average <= previous_average + self.SCORE_IMPROVEMENT_EPSILON
                and self.get_rerun_tools(critique)
            ):
                convergence_reason = "No score improvement detected"
                break

        append_log(self.build_convergence_log(
            iterations_used=iterations_used,
            convergence_reason=convergence_reason,
            iteration_scores=iteration_scores,
        ))
        report = reporter.generate_report(idea, results, execution_log)

        append_log({
            "agent": "reporter",
            "status": "completed",
            "model_used": report["model_used"],
            "timestamp": self._timestamp(),
        })

        weighted_score = self.compute_weighted_score(critique.get("section_scores", {}), classification["weights"])
        analysis_confidence = self.compute_confidence_score(
            critique,
            classification["classification_confidence"],
        )

        return {
            "idea_type": classification["idea_type"],
            "classification_confidence": classification["classification_confidence"],
            "analysis_confidence": analysis_confidence,
            "weighted_score": weighted_score,
            "iterations_used": iterations_used,
            "convergence_reason": convergence_reason,
            "iteration_scores": iteration_scores,
            "models_used": self.collect_models_used(execution_log),
            "results": results,
            "execution_log": execution_log,
            "critique": critique,
            "report_summary": report["summary"],
            "status": "partial" if self.has_failed_tools(execution_log) else "completed",
        }
