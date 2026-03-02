from apps.agent.planner import PlannerAgent
from apps.agent.executor import ToolExecutor
from apps.agent.critic import CriticAgent
from apps.analytics.models import IdeaTypeWeights
from integrations.gemini_client import generate_text
from apps.analytics.market_model import MarketModelEngine
from apps.agent.tools.market import extract_structured_market_data
import json
import re


# =========================================================
# ========= IDEA CLASSIFICATION SYSTEM ====================
# =========================================================

BASE_IDEA_TYPES = {
    "tech": {
        "similar_startups": 0.15,
        "market_data": 0.20,
        "funding_info": 0.15,
        "monetization": 0.25,
        "swot": 0.25
    },
    "marketplace": {
        "similar_startups": 0.25,
        "market_data": 0.25,
        "funding_info": 0.20,
        "monetization": 0.15,
        "swot": 0.15
    },
    "deeptech": {
        "similar_startups": 0.15,
        "market_data": 0.25,
        "funding_info": 0.25,
        "monetization": 0.15,
        "swot": 0.20
    },
    "general": {
        "similar_startups": 0.2,
        "market_data": 0.2,
        "funding_info": 0.2,
        "monetization": 0.2,
        "swot": 0.2
    }
}


# ---------- Rule-Based Fallback ----------

def rule_based_classification(idea: str) -> str:
    idea_lower = idea.lower()

    if any(k in idea_lower for k in ["ai", "software", "app", "platform", "saas"]):
        return "tech"
    elif any(k in idea_lower for k in ["marketplace", "ecommerce", "retail"]):
        return "marketplace"
    elif any(k in idea_lower for k in ["biotech", "agriculture", "medical", "pharma"]):
        return "deeptech"
    else:
        return "general"


# ---------- LLM-Based Classification ----------

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

    try:
        response = generate_text(prompt)

        json_match = re.search(r"\{.*\}", response, re.DOTALL)
        if not json_match:
            return None

        parsed = json.loads(json_match.group())

        category = parsed.get("category", "").strip().lower()
        confidence = float(parsed.get("confidence", 0))

        if not category:
            return None

        return category, confidence

    except Exception:
        return None


# ---------- Hybrid Classifier ----------

def hybrid_classify_idea(idea: str):

    llm_result = llm_based_classification(idea)

    if llm_result:
        category, confidence = llm_result

        # Dynamically register new category if not existing
        if category not in BASE_IDEA_TYPES:
            BASE_IDEA_TYPES[category] = BASE_IDEA_TYPES["general"]

        return category, confidence, "llm"

    # Fallback
    fallback_category = rule_based_classification(idea)
    return fallback_category, 0.6, "rule_based"


# =========================================================
# ================= ORCHESTRATOR ==========================
# =========================================================

class StartupOrchestrator:

    MAX_ITERATIONS = 3
    TARGET_OVERALL = 8
    MIN_SECTION_SCORE = 5
    TARGET_WEIGHTED = 7.5

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

        # Final confidence blending
        confidence = (
            0.4 * (overall / 10) +
            0.4 * (section_avg / 10) +
            0.2 * classification_confidence
        )

        return round(confidence, 3)

    def is_quality_satisfied(self, critique, weights):

        overall = critique.get("overall_score", 0)
        sections = critique.get("section_scores", {})

        if not sections:
            return False

        min_section = min(sections.values())
        weighted_score = self.compute_weighted_score(sections, weights)

        return (
            overall >= self.TARGET_OVERALL and
            min_section >= self.MIN_SECTION_SCORE and
            weighted_score >= self.TARGET_WEIGHTED
        )

    def run(self, idea: str):

        planner = PlannerAgent()
        executor = ToolExecutor()
        critic = CriticAgent()

        execution_log = []
        results = {}

        # ---------- Hybrid Classification ----------
        idea_type, classification_confidence, source = hybrid_classify_idea(idea)

        weight_doc = IdeaTypeWeights.objects(idea_type=idea_type).first()
        if weight_doc:
           weights = weight_doc.weights
        else:
           weights = BASE_IDEA_TYPES.get(idea_type)
        execution_log.append({
            "type": "idea_classification",
            "idea_type": idea_type,
            "classification_source": source,
            "classification_confidence": classification_confidence,
            "weights_used": weights
        })

        # ---------- Initial Execution ----------
        plan = planner.create_plan(idea)

        execution_data = executor.execute_with_plan(idea, plan)
        results.update(execution_data["results"])

        # ---------- Quantitative Market Modeling ----------
        if results.get("market_data"):

           structured_data = extract_structured_market_data(
            results.get("market_data")
           )

           if structured_data:
               market_model = MarketModelEngine.build_market_model(structured_data)
               results["market_quantitative_model"] = market_model
           else:
               results["market_quantitative_model"] = None
        execution_log += execution_data["execution_log"]

        critique = critic.review(idea, results)

        iteration = 0

        # ---------- Adaptive Self-Healing Loop ----------
        while iteration < self.MAX_ITERATIONS:

            if self.is_quality_satisfied(critique, weights):
                execution_log.append({
                    "type": "convergence",
                    "reason": "Quality thresholds satisfied"
                })
                break

            if not critique.get("needs_rerun"):
                execution_log.append({
                    "type": "convergence",
                    "reason": "Critic indicates no rerun needed"
                })
                break

            rerun_tools = critique.get("rerun_tools", [])
            if not rerun_tools:
                execution_log.append({
                    "type": "convergence",
                    "reason": "No rerun tools provided"
                })
                break

            iteration += 1

            execution_log.append({
                "type": "self_healing_cycle",
                "iteration": iteration,
                "rerun_tools": rerun_tools
            })

            rerun_plan = {
                "steps": [{"tool": tool} for tool in rerun_tools]
            }

            rerun_data = executor.execute_with_plan(idea, rerun_plan)
            results.update(rerun_data["results"])
            execution_log += rerun_data["execution_log"]

            critique = critic.review(idea, results)

        # ---------- Confidence Scoring ----------
        final_confidence = self.compute_confidence_score(
            critique,
            classification_confidence
        )
        

        return {
            "idea_type": idea_type,
            "classification_confidence": classification_confidence,
            "analysis_confidence": final_confidence,
            "results": results,
            "execution_log": execution_log,
            "critique": critique
        }
