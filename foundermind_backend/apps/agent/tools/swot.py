import json
from django.conf import settings
from integrations.gemini_client import call_llm


SWOT_PROMPT = """
You are a senior startup analyst conducting a deep strategic analysis.

Startup Idea: "{idea}"

Context from research agents:
Similar Startups: {similar_results}
Market Data: {market_data}
Funding Info: {funding_info}
Monetization Strategies: {monetization}
Customer Profile: {customer_profile}

Return ONLY a valid JSON object. No markdown, no explanation, no code blocks, no backticks.

The JSON must follow this exact schema:

{{
  "critical_insight": {{
    "label": "2-5 word name of the single most dangerous threat or critical weakness",
    "detail": "One sentence explaining why this is the most important risk to address immediately — specific to this idea"
  }},
  "competitive_position": {{
    "stance": "One of exactly: Vulnerable Position, At Risk, Defensible Position, Strong Position",
    "description": "One sentence specific to this idea explaining why the startup sits at this position — reference the actual market, competitors, or product",
    "score": integer between 0 and 100 representing competitive strength (0=most vulnerable, 100=strongest moat)
  }},
  "strengths": [
    {{
      "term": "2-5 word strength name",
      "detail": "One sentence summary for the main grid view — specific to this idea",
      "explore": {{
        "deep_dive": "3-4 sentence paragraph going deep on this strength — why it matters, how it creates advantage, what it enables for this specific startup",
        "strategic_imperatives": [
          "Specific actionable step the founder should take — concrete, references this idea's actual market or product, not generic advice",
          "Second specific actionable step — time-bound or milestone-based where possible"
        ]
      }}
    }}
  ],
  "weaknesses": [
    {{
      "term": "2-5 word weakness name",
      "detail": "One sentence summary for the main grid view",
      "severity": integer 1 2 or 3 where 3 is most severe,
      "explore": {{
        "deep_dive": "3-4 sentence paragraph on this weakness — root cause, business impact, and what happens if ignored",
        "strategic_imperatives": [
          "Specific action to mitigate this weakness — concrete and idea-specific",
          "Second mitigation action"
        ]
      }}
    }}
  ],
  "opportunities": [
    {{
      "term": "2-5 word opportunity name",
      "detail": "One sentence summary for the main grid view",
      "potential": integer 1 2 or 3 where 3 is highest potential,
      "explore": {{
        "deep_dive": "3-4 sentence paragraph on this opportunity — market timing, how to capture it, what resources or partnerships are needed",
        "strategic_imperatives": [
          "Specific action to capture this opportunity — names the actual market segment, partner type, or product feature",
          "Second action"
        ]
      }}
    }}
  ],
  "threats": [
    {{
      "term": "2-5 word threat name",
      "detail": "One sentence summary for the main grid view",
      "severity": integer 1 2 or 3 where 3 is most severe,
      "explore": {{
        "deep_dive": "3-4 sentence paragraph on this threat — who the threat comes from, timeline, and what the worst-case scenario looks like",
        "strategic_imperatives": [
          "Specific defensive action — names actual competitors, regulations, or market forces relevant to this idea",
          "Second defensive action"
        ]
      }}
    }}
  ]
}}

Rules:
- Return between 3 and 5 items per quadrant
- strengths has no severity or potential field — omit it entirely for strengths
- weaknesses and threats use severity (1-3)
- opportunities uses potential (1-3)
- competitive_position.score guide:
    0-25 = Vulnerable (easily replicated, no moat)
    26-50 = At Risk (some differentiation but exposed)
    51-75 = Defensible (meaningful moat with real threats)
    76-100 = Strong (hard to replicate, network effects or proprietary data)
- stance must match the score range above
- critical_insight must reference the single most existential risk — the thing that could kill the business fastest
- strategic_imperatives must NEVER be generic. Never write:
    "Initiate quantitative analysis" or "Develop contingencies" or "Allocate resources"
  Always write actions specific to this idea, this market, this product
- All deep_dive and strategic_imperatives text must be meaningfully different from the detail field — not a repetition
- Never return markdown formatting, asterisks, numbered lists, or prose outside the JSON
"""


VALID_STANCES = {
    "Vulnerable Position",
    "At Risk",
    "Defensible Position",
    "Strong Position",
}


def _stringify_context(value: object, max_length: int) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        text = value
    else:
        try:
            text = json.dumps(value, ensure_ascii=False, indent=2)
        except TypeError:
            text = str(value)

    return text[:max_length]


def sanitize_item(item: dict, quadrant: str) -> dict:
    """Sanitize and validate a single SWOT item."""
    sanitized = {
        "term": str(item.get("term", "Unnamed Point"))[:100],
        "detail": str(item.get("detail", ""))[:500],
        "explore": {
            "deep_dive": str(item.get("explore", {}).get("deep_dive", ""))[:2000],
            "strategic_imperatives": [
                str(imp)[:500]
                for imp in item.get("explore", {}).get("strategic_imperatives", [])[:3]
            ]
        }
    }
    if quadrant in ("weaknesses", "threats"):
        raw_severity = item.get("severity", 2)
        sanitized["severity"] = max(1, min(3, int(raw_severity) if str(raw_severity).isdigit() else 2))
    if quadrant == "opportunities":
        raw_potential = item.get("potential", 2)
        sanitized["potential"] = max(1, min(3, int(raw_potential) if str(raw_potential).isdigit() else 2))
    return sanitized


def parse_swot_response(raw: str) -> dict:
    """Parse and sanitize the LLM JSON response into a clean structured dict."""
    empty = {
        "critical_insight": {"label": "", "detail": ""},
        "competitive_position": {"stance": "Defensible Position", "description": "", "score": 50},
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": [],
    }

    try:
        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        parsed = json.loads(clean.strip())
        if not isinstance(parsed, dict):
            return empty
    except (json.JSONDecodeError, IndexError, ValueError):
        return empty

    # Sanitize critical_insight
    ci = parsed.get("critical_insight", {})
    critical_insight = {
        "label": str(ci.get("label", ""))[:100],
        "detail": str(ci.get("detail", ""))[:500],
    }

    # Sanitize competitive_position
    cp = parsed.get("competitive_position", {})
    raw_score = cp.get("score", 50)
    try:
        score = max(0, min(100, int(raw_score)))
    except (ValueError, TypeError):
        score = 50
    stance = cp.get("stance", "Defensible Position")
    if stance not in VALID_STANCES:
        stance = "Defensible Position"
    competitive_position = {
        "stance": stance,
        "description": str(cp.get("description", ""))[:500],
        "score": score,
    }

    # Sanitize quadrants
    quadrants = {}
    for quadrant in ("strengths", "weaknesses", "opportunities", "threats"):
        raw_items = parsed.get(quadrant, [])
        if not isinstance(raw_items, list):
            quadrants[quadrant] = []
            continue
        quadrants[quadrant] = [
            sanitize_item(item, quadrant)
            for item in raw_items[:5]
            if isinstance(item, dict)
        ]

    return {
        "critical_insight": critical_insight,
        "competitive_position": competitive_position,
        **quadrants,
    }


def generate_swot_analysis(
    idea: str,
    similar_results: object,
    market_data: object,
    funding_info: object,
    monetization: object,
    customer_profile: object,
) -> dict:
    prompt = SWOT_PROMPT.format(
        idea=idea,
        similar_results=_stringify_context(similar_results, 2000),
        market_data=_stringify_context(market_data, 2000),
        funding_info=_stringify_context(funding_info, 1000),
        monetization=_stringify_context(monetization, 1000),
        customer_profile=_stringify_context(customer_profile, 2000),
    )
    model = settings.AGENT_MODELS["tool_heavy"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    raw = call_llm(prompt, model=model, fallback_model=fallback)
    return parse_swot_response(raw)
