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
    MIN_SECTION_SCORE = 5
    TARGET_WEIGHTED = 7.5

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
            "section_scores": {section: 5 for section in DEFAULT_CRITIQUE_SECTIONS},
            "issues_found": issues,
            "rerun_tools": [],
            "needs_rerun": False,
        }

    def review_results(self, idea: str, results: dict, log_callback=None):
        critic = CriticAgent()
        try:
            critique, critic_model = critic.review(idea, results)
            self._append_log(log_callback, {
                "agent": "critic",
                "status": "completed",
                "model_used": critic_model,
                "timestamp": self._timestamp(),
            })
            return critique, critic_model
        except Exception as exc:
            self._append_log(log_callback, {
                "agent": "critic",
                "status": "failed",
                "error": str(exc),
                "error_type": type(exc).__name__,
                "timestamp": self._timestamp(),
            })
            return self.build_default_critique(f"Critic failed: {exc}"), None

    def has_failed_tools(self, execution_log: list[dict]) -> bool:
        return any(
            entry.get("tool") and entry.get("status") == "failed"
            for entry in execution_log
        )

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
        )
        results = self.enrich_results(execution_data["results"])
        critique, _ = self.review_results(idea, results, log_callback=append_log)
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
            "iterations_used": 0,
            "convergence_reason": "Single-pass execution complete",
            "models_used": self.collect_models_used(execution_log),
            "results": results,
            "execution_log": execution_log,
            "critique": critique,
            "report_summary": report["summary"],
            "status": "partial" if self.has_failed_tools(execution_log) else "completed",
        }
