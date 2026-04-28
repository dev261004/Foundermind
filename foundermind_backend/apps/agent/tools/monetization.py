import json
from django.conf import settings
from integrations.gemini_client import call_llm


MONETIZATION_PROMPT = """
You are a startup business advisor. Analyze this startup idea and return
exactly 4 monetization strategies as a JSON array.

Startup Idea: "{idea}"

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks, no backticks.

Each item must follow this exact schema:
{{
  "strategy_name": "concise name e.g. SaaS Subscription (B2B/Enterprise)",
  "type": "one of exactly: B2B, API, B2C, Institutional",
  "description": "2-3 sentences explaining the strategy and why it fits this specific idea",
  "fit_score": "one of exactly: High, Medium, Low",
  "revenue_potential": integer between 0 and 100
}}

Assignment rules:
- Return exactly 4 strategies in a JSON array
- Order by revenue_potential descending — strongest strategy first
- revenue_potential: 85-100=very high, 65-84=high, 45-64=medium, below 45=low
- fit_score: High=strong product-market fit, Medium=viable but secondary, Low=exploratory only
- type must be exactly one of the four values listed — nothing else
- Never return markdown, asterisks, numbered lists, prose, or code fences
"""


def parse_monetization_response(raw: str) -> list:
    try:
        clean = raw.strip()
        # Strip accidental code fences
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        parsed = json.loads(clean.strip())
        if isinstance(parsed, list):
            return parsed[:4]
        return []
    except (json.JSONDecodeError, IndexError, ValueError):
        return []


def generate_monetization_strategy(idea: str) -> list:
    prompt = MONETIZATION_PROMPT.format(idea=idea)
    model = settings.AGENT_MODELS["tool_heavy"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    raw = call_llm(prompt, model=model, fallback_model=fallback)
    return parse_monetization_response(raw)
