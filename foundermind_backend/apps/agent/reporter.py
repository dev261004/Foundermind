import json
import logging

from django.conf import settings

from integrations.gemini_client import call_llm

logger = logging.getLogger(__name__)

VALID_TIMEFRAMES = {"This Week", "This Month", "Next 90 Days", "Next 6 Months"}
VALID_CATEGORIES = {"Revenue", "Defense", "Growth", "Product", "Validation", "Hiring"}

SAFE_FALLBACK_PLAN = {
    "horizon": "",
    "actions": [],
}


def _extract_context(results: dict) -> str:
    """Build compact context string from analysis results for the reporter prompt."""
    parts = []

    # SWOT
    swot = results.get("swot")
    if isinstance(swot, dict):
        ci = swot.get("critical_insight") or {}
        if isinstance(ci, dict) and ci.get("label"):
            parts.append(f"SWOT Critical Insight: {ci['label']} — {ci.get('detail', '')}")

        cp = swot.get("competitive_position") or {}
        if isinstance(cp, dict) and cp.get("stance"):
            parts.append(f"Competitive Position: {cp['stance']} (score {cp.get('score', 'N/A')})")

        threats = swot.get("threats") or []
        if isinstance(threats, list):
            for t in threats[:2]:
                if isinstance(t, dict) and t.get("term"):
                    parts.append(f"Threat: {t['term']} — {t.get('detail', '')}")

        opportunities = swot.get("opportunities") or []
        if isinstance(opportunities, list):
            for o in opportunities[:2]:
                if isinstance(o, dict) and o.get("term"):
                    parts.append(f"Opportunity: {o['term']} — {o.get('detail', '')}")

    # Market data
    market = results.get("market_quantitative_model") or results.get("market_data")
    if isinstance(market, dict):
        opp = market.get("opportunity_score")
        cagr = market.get("cagr")
        if opp is not None:
            parts.append(f"Market Opportunity Score: {opp}")
        if cagr is not None:
            parts.append(f"Market CAGR: {cagr}")

    # Customer profile
    customer = results.get("customer_profile")
    if isinstance(customer, dict):
        persona = customer.get("persona_name")
        if persona:
            parts.append(f"Target Persona: {persona}")

    # Monetization
    monetization = results.get("monetization")
    if isinstance(monetization, list) and monetization:
        top = monetization[0]
        if isinstance(top, dict):
            parts.append(
                f"Top Monetization: {top.get('strategy_name', 'Unknown')} (fit score {top.get('fit_score', 'N/A')})"
            )

    # Comparable startups
    similar = results.get("similar_startups")
    if isinstance(similar, list) and similar:
        names = [s.get("company_name") or s.get("name", "") for s in similar if isinstance(s, dict)]
        names = [n for n in names if n]
        if names:
            parts.append(f"Comparable Startups: {', '.join(names[:5])}")

    # Funding signals
    funding = results.get("funding_info")
    if isinstance(funding, list) and funding:
        for f in funding[:3]:
            if isinstance(f, dict) and f.get("company_name"):
                parts.append(f"Funding Signal: {f['company_name']} — {f.get('funding_amount', 'N/A')}")

    return "\n".join(parts) if parts else "No structured analysis data available."


def _parse_action_plan(raw_text: str) -> dict:
    """Parse JSON action plan from LLM response, stripping code fences."""
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.warning("Failed to parse action plan JSON: %s", exc)
        return dict(SAFE_FALLBACK_PLAN)


def _sanitize_action_plan(plan: dict) -> dict:
    """Validate and sanitize the parsed action plan."""
    horizon = str(plan.get("horizon", "")).strip()

    raw_actions = plan.get("actions")
    if not isinstance(raw_actions, list):
        raw_actions = []

    actions = []
    for i, action in enumerate(raw_actions[:6]):
        if not isinstance(action, dict):
            continue

        priority = action.get("priority", i + 1)
        try:
            priority = max(1, min(6, int(priority)))
        except (TypeError, ValueError):
            priority = i + 1

        timeframe = action.get("timeframe", "This Month")
        if timeframe not in VALID_TIMEFRAMES:
            timeframe = "This Month"

        category = action.get("category", "Growth")
        if category not in VALID_CATEGORIES:
            category = "Growth"

        actions.append({
            "priority": priority,
            "title": str(action.get("title", ""))[:100].strip(),
            "what": str(action.get("what", ""))[:300].strip(),
            "why": str(action.get("why", ""))[:300].strip(),
            "timeframe": timeframe,
            "category": category,
        })

    return {
        "horizon": horizon,
        "actions": actions,
    }


class ReporterAgent:
    UNAVAILABLE_NOTE = "[Section unavailable — could not be retrieved]"

    def generate_report(self, idea: str, results: dict, execution_log: list[dict]):
        context = _extract_context(results)

        prompt = f"""You are a senior startup strategist who has just reviewed a complete AI analysis of a startup idea. Your job is to produce a prioritized action plan for the founder — not a summary of what was found, but a directive list of what to do next.

Return a JSON object with exactly this shape:
{{
  "horizon": "one sentence describing the overall strategic moment this founder is in — reference the specific idea, market timing, or biggest risk. Never generic.",
  "actions": [
    {{
      "priority": 1,
      "title": "3-6 word action title",
      "what": "One sentence — exactly what the founder should do",
      "why": "One sentence — which specific finding from the analysis makes this urgent. Must reference a concrete data point, competitor name, score, or insight — never vague reasoning",
      "timeframe": "one of: This Week, This Month, Next 90 Days, Next 6 Months",
      "category": "one of: Revenue, Defense, Growth, Product, Validation, Hiring"
    }}
  ]
}}

Rules:
- Return ONLY valid JSON — no markdown, no code blocks, no prose outside the JSON
- Generate exactly 4-6 actions — never fewer than 4, never more than 6
- Actions must be ordered by urgency — most time-sensitive first
- Every "why" field must reference something specific from the analysis data provided — a competitor name, a TAM figure, a threat label, a persona name, a funding signal, a SWOT point. Never write generic reasoning like "this is important for growth"
- "horizon" must be specific to this idea — never a generic statement about startups
- "timeframe" must be exactly one of: This Week, This Month, Next 90 Days, Next 6 Months
- "category" must be exactly one of: Revenue, Defense, Growth, Product, Validation, Hiring

Startup Idea:
{idea}

Analysis Findings:
{context}
"""

        model = settings.AGENT_MODELS["reporter"]
        fallback = settings.AGENT_MODELS["fallback_gemma"]

        try:
            response = call_llm(prompt, model=model, fallback_model=fallback)
            raw = str(response)
            parsed = _parse_action_plan(raw)
            action_plan = _sanitize_action_plan(parsed)
        except Exception as exc:
            logger.warning("Reporter failed to generate action plan: %s", exc)
            action_plan = dict(SAFE_FALLBACK_PLAN)

        return {
            "action_plan": action_plan,
            "model_used": model,
        }
