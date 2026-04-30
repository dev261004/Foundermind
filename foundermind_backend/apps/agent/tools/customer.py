import json

from django.conf import settings

from integrations.gemini_client import call_llm


CUSTOMER_PROFILE_PROMPT = """
You are a startup market strategist.

Based on the startup idea below, generate a single Ideal Customer Profile (ICP).

Startup Idea: "{idea}"

Return ONLY a valid JSON object. No markdown, no code blocks, no backticks, and no prose.

The JSON object must contain exactly these 12 top-level fields:
{{
  "persona_name": "3-5 word archetype name like The Busy Professional or The Solo Founder",
  "age_range": "Age range like 25-40",
  "profession": "One paragraph describing who this person is professionally and where they work",
  "buying_behavior_tags": ["TIME-STARVED", "AMBITIOUS"],
  "quote": "\"Authentic first-person quote revealing a specific frustration or desire.\"",
  "demographics": {{
    "annual_income": "$100k - $250k",
    "locations": "Tier 1 Cities",
    "education": "Bachelors+"
  }},
  "brand_affinities": ["Uber", "Notion"],
  "persona_strength": 72,
  "needs": [
    {{
      "text": "One sentence describing the need",
      "icon_emoji": "🚀"
    }}
  ],
  "pain_points": [
    {{
      "text": "One sentence describing the frustration",
      "severity": 3
    }}
  ],
  "buying_behavior": [
    {{
      "label": "Mobile-First",
      "icon_emoji": "📱"
    }}
  ],
  "value_proposition": [
    {{
      "text": "One sentence describing the core value delivered",
      "icon_emoji": "✨"
    }}
  ]
}}

Field rules:
- persona_name: never generic, always a specific 3-5 word archetype
- age_range: short string like 25-40, 30-55, or 18-30
- profession: one paragraph only, no bullets
- buying_behavior_tags: array of 2-4 short uppercase labels, each max 3 words
- quote: first-person, authentic, specific, 1-2 sentences, wrapped in quotes
- demographics must contain exactly annual_income, locations, education
- brand_affinities: array of 2-4 real recognizable brands relevant to this persona
- persona_strength: integer from 0 to 100
- needs: array of 3-5 objects with text and a single relevant emoji
- pain_points: array of 3-5 objects with text and severity where severity is exactly 1, 2, or 3
- buying_behavior: array of 3-5 objects with a 2-3 word label and a single relevant emoji
- value_proposition: array of 2-4 objects with text and a single relevant emoji

Output rules:
- Return only the JSON object
- No markdown formatting, no asterisks, no numbered lists, no prose outside JSON
- All text fields must be clean sentences with no markdown artifacts
- severity must be exactly 1, 2, or 3
- persona_strength must be 0-100
"""


class CustomerProfileResult(dict):
    """Dict result that also preserves the model_used metadata for logging."""


def _strip_code_fences(raw: str) -> str:
    clean = raw.strip()
    if clean.startswith("```"):
        parts = clean.split("```")
        clean = parts[1] if len(parts) > 1 else clean
        clean = clean.strip()
        if clean.lower().startswith("json"):
            clean = clean[4:]
    return clean.strip()


def _truncate_text(value: object, max_length: int, default: str = "") -> str:
    raw_text = str(value or "").replace("`", "").replace("*", "")
    text = " ".join(raw_text.split()).strip()
    for prefix in ("- ", "• "):
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
    if not text:
        return default
    return text[:max_length]


def _clamp_int(value: object, minimum: int, maximum: int, default: int) -> int:
    try:
        numeric_value = int(value)
    except (TypeError, ValueError):
        numeric_value = default
    return max(minimum, min(maximum, numeric_value))


def _truncate_list(values: object, max_items: int = 6) -> list:
    if not isinstance(values, list):
        return []
    return values[:max_items]


def _sanitize_string_list(
    values: object,
    *,
    max_items: int = 6,
    max_length: int = 60,
    uppercase: bool = False,
) -> list[str]:
    sanitized_items = []
    for value in _truncate_list(values, max_items=max_items):
        item = _truncate_text(value, max_length)
        if not item:
            continue
        sanitized_items.append(item.upper() if uppercase else item)
    return sanitized_items


def _normalize_quote(value: object) -> str:
    quote = _truncate_text(value, 320)
    if not quote:
        return ""
    if quote[0] not in {'"', "“"}:
        quote = f'"{quote}'
    if quote[-1] not in {'"', "”"}:
        quote = f'{quote}"'
    return quote


def _sanitize_demographics(value: object) -> dict:
    data = value if isinstance(value, dict) else {}
    return {
        "annual_income": _truncate_text(data.get("annual_income"), 80),
        "locations": _truncate_text(data.get("locations"), 80),
        "education": _truncate_text(data.get("education"), 80),
    }


def _sanitize_needs(values: object) -> list[dict]:
    items = []
    for item in _truncate_list(values):
        if not isinstance(item, dict):
            continue
        text = _truncate_text(item.get("text"), 220)
        if not text:
            continue
        items.append({
            "text": text,
            "icon_emoji": _truncate_text(item.get("icon_emoji"), 8),
        })
    return items


def _sanitize_pain_points(values: object) -> list[dict]:
    items = []
    for item in _truncate_list(values):
        if not isinstance(item, dict):
            continue
        text = _truncate_text(item.get("text"), 220)
        if not text:
            continue
        items.append({
            "text": text,
            "severity": _clamp_int(item.get("severity"), 1, 3, 2),
        })
    return items


def _sanitize_buying_behavior(values: object) -> list[dict]:
    items = []
    for item in _truncate_list(values):
        if not isinstance(item, dict):
            continue
        label = _truncate_text(item.get("label"), 60)
        if not label:
            continue
        items.append({
            "label": label,
            "icon_emoji": _truncate_text(item.get("icon_emoji"), 8),
        })
    return items


def _sanitize_value_proposition(values: object) -> list[dict]:
    items = []
    for item in _truncate_list(values):
        if not isinstance(item, dict):
            continue
        text = _truncate_text(item.get("text"), 220)
        if not text:
            continue
        items.append({
            "text": text,
            "icon_emoji": _truncate_text(item.get("icon_emoji"), 8),
        })
    return items


def parse_customer_profile_response(raw: str) -> dict:
    try:
        parsed = json.loads(_strip_code_fences(raw))
    except (json.JSONDecodeError, TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def sanitize_customer_profile(data: dict) -> dict:
    return {
        "persona_name": _truncate_text(data.get("persona_name"), 80),
        "age_range": _truncate_text(data.get("age_range"), 30),
        "profession": _truncate_text(data.get("profession"), 500),
        "buying_behavior_tags": _sanitize_string_list(
            data.get("buying_behavior_tags"),
            max_length=30,
            uppercase=True,
        ),
        "quote": _normalize_quote(data.get("quote")),
        "demographics": _sanitize_demographics(data.get("demographics")),
        "brand_affinities": _sanitize_string_list(
            data.get("brand_affinities"),
            max_length=50,
        ),
        "persona_strength": _clamp_int(
            data.get("persona_strength"),
            0,
            100,
            0,
        ),
        "needs": _sanitize_needs(data.get("needs")),
        "pain_points": _sanitize_pain_points(data.get("pain_points")),
        "buying_behavior": _sanitize_buying_behavior(data.get("buying_behavior")),
        "value_proposition": _sanitize_value_proposition(
            data.get("value_proposition"),
        ),
    }


def _attach_model_used(result: dict, model_used: str | None) -> dict:
    structured_result = CustomerProfileResult(result)
    structured_result.model_used = model_used
    return structured_result


def generate_customer_profile(idea: str) -> dict:
    prompt = CUSTOMER_PROFILE_PROMPT.format(idea=idea)
    model = settings.AGENT_MODELS["tool_heavy"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    raw = call_llm(prompt, model=model, fallback_model=fallback)
    parsed = parse_customer_profile_response(raw)
    if not parsed:
        return _attach_model_used({}, getattr(raw, "model_used", None))
    return _attach_model_used(
        sanitize_customer_profile(parsed),
        getattr(raw, "model_used", None),
    )
