import json
import re

from django.conf import settings

from integrations.gemini_client import call_llm


TECHNICAL_HINTS = (
    "ai",
    "api",
    "app",
    "automation",
    "blockchain",
    "cloud",
    "data",
    "database",
    "developer",
    "devops",
    "ml",
    "mobile",
    "platform",
    "saas",
    "software",
    "web",
    "backend",
    "frontend",
    "pipeline",
    "agent",
    "model",
    "llm",
    "scraping",
    "analytics",
    "dashboard",
)

VALID_GRADIENTS = {
    "from-orange-500 to-orange-600",
    "from-teal-500 to-teal-600",
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-green-500 to-green-600",
    "from-cyan-500 to-cyan-600",
    "from-red-500 to-red-600",
    "from-pink-500 to-pink-600",
}
VALID_CONFIDENCE = {"Essential", "Recommended", "Optional"}
DEFAULT_GRADIENT = "from-purple-500 to-purple-600"
DEFAULT_CONFIDENCE = "Recommended"

TECH_STACK_PROMPT = """
You are a senior software architect.

Based on the startup idea below, return a single JSON object with one top-level key called "categories".

Startup Idea: "{idea}"

Return ONLY valid JSON. No markdown, no code blocks, no backticks, and no prose.

Schema:
{{
  "categories": [
    {{
      "id": "kebab-case identifier derived from the category name",
      "name": "Human readable category name",
      "gradient": "Exactly one valid Tailwind gradient string from the allowed list",
      "items": [
        {{
          "id": "kebab-case identifier",
          "name": "Technology name",
          "emoji": "Single relevant emoji",
          "description": "One sentence describing what this technology does in the context of this specific idea",
          "reasoning": "One sentence explaining specifically why the agent chose this technology over alternatives for this idea",
          "confidence": "Exactly one of Essential, Recommended, Optional",
          "alternatives": ["Alternative A", "Alternative B"]
        }}
      ]
    }}
  ]
}}

Gradient rules:
- Data or Scraping => "from-orange-500 to-orange-600"
- Backend or API => "from-teal-500 to-teal-600"
- Search or Index => "from-blue-500 to-blue-600"
- Frontend or UI => "from-purple-500 to-purple-600"
- Infrastructure or DevOps => "from-green-500 to-green-600"
- Database => "from-cyan-500 to-cyan-600"
- Auth or Security => "from-red-500 to-red-600"
- AI or ML => "from-pink-500 to-pink-600"

Output rules:
- Maximum 6 categories
- Maximum 5 technologies per category
- confidence must be exactly one of: Essential, Recommended, Optional
- gradient must be exactly one of the 8 allowed strings above
- alternatives must be an array of 2-3 plain technology name strings only, never objects
- Return only the JSON object
"""


class TechStackResult(dict):
    """Dict result that also preserves the model_used metadata for logging."""


def is_technical_startup(idea: str) -> bool:
    idea_lower = idea.lower()
    return any(keyword in idea_lower for keyword in TECHNICAL_HINTS)


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


def _slugify(value: object, fallback: str) -> str:
    text = _truncate_text(value, 80)
    if not text:
        text = fallback
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or fallback


def _sanitize_string_list(values: object, max_items: int) -> list[str]:
    if not isinstance(values, list):
        return []
    sanitized = []
    for value in values[:max_items]:
        item = _truncate_text(value, 60)
        if item:
            sanitized.append(item)
    return sanitized


def _sanitize_item(item: dict, index: int) -> dict:
    name = _truncate_text(item.get("name"), 80, f"Technology {index + 1}")
    confidence = _truncate_text(item.get("confidence"), 20, DEFAULT_CONFIDENCE)
    if confidence not in VALID_CONFIDENCE:
        confidence = DEFAULT_CONFIDENCE

    return {
        "id": _slugify(item.get("id") or name, f"tech-{index + 1}"),
        "name": name,
        "emoji": _truncate_text(item.get("emoji"), 8),
        "description": _truncate_text(item.get("description"), 300),
        "reasoning": _truncate_text(item.get("reasoning"), 300),
        "confidence": confidence,
        "alternatives": _sanitize_string_list(item.get("alternatives"), 3),
    }


def _sanitize_category(category: dict, index: int) -> dict:
    name = _truncate_text(category.get("name"), 80, f"Category {index + 1}")
    gradient = _truncate_text(category.get("gradient"), 80, DEFAULT_GRADIENT)
    if gradient not in VALID_GRADIENTS:
        gradient = DEFAULT_GRADIENT

    items = category.get("items", [])
    if not isinstance(items, list):
        items = []

    return {
        "id": _slugify(category.get("id") or name, f"category-{index + 1}"),
        "name": name,
        "gradient": gradient,
        "items": [
            _sanitize_item(item, item_index)
            for item_index, item in enumerate(items[:5])
            if isinstance(item, dict)
        ],
    }


def parse_tech_stack_response(raw: str) -> dict:
    try:
        parsed = json.loads(_strip_code_fences(raw))
    except (json.JSONDecodeError, TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def sanitize_tech_stack(data: dict) -> dict:
    categories = data.get("categories", [])
    if not isinstance(categories, list):
        categories = []

    return {
        "categories": [
            _sanitize_category(category, index)
            for index, category in enumerate(categories[:6])
            if isinstance(category, dict)
        ],
    }


def _attach_model_used(result: dict, model_used: str | None) -> dict:
    structured_result = TechStackResult(result)
    structured_result.model_used = model_used
    return structured_result


def suggest_tech_stack(idea: str) -> dict:
    if not is_technical_startup(idea):
        return _attach_model_used({}, None)

    prompt = TECH_STACK_PROMPT.format(idea=idea)
    model = settings.AGENT_MODELS["tool_heavy"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    raw = call_llm(
        prompt,
        model=model,
        fallback_model=fallback,
    )
    parsed = parse_tech_stack_response(raw)
    if not parsed:
        return _attach_model_used({}, getattr(raw, "model_used", None))
    return _attach_model_used(
        sanitize_tech_stack(parsed),
        getattr(raw, "model_used", None),
    )
