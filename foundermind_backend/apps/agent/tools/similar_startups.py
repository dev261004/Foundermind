import json

from django.conf import settings

from integrations.gemini_client import call_llm
from integrations.serpapi_client import search_google


VALID_ICON_TYPES = {
    "shield",
    "newspaper",
    "building",
    "circle",
    "globe",
    "code",
    "chart",
    "bolt",
}


SIMILAR_STARTUPS_PROMPT = """
You are a startup research analyst. Based on the search results below, identify the most relevant similar startups or companies to the given idea.

Startup Idea: "{idea}"

Search Results:
{search_results}

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks, no backticks.

Each item must follow this exact schema:
{{
  "company_name": "Clean company or product name — no asterisks, no markdown",
  "category_tag": "1-3 word label describing what type of company this is (e.g. AI Trust, Rating System, Nonprofit, Developer Tool) — never copy the company name here",
  "description": "One clean sentence describing what the company does and why it is relevant to the submitted idea — no markdown, no raw URLs, no citation markers like [Result 1]",
  "url": "Most relevant source URL for this company from the search results — empty string if not found",
  "icon_type": "One of exactly: shield, newspaper, building, circle, globe, code, chart, bolt — choose based on what the company does"
}}

Icon type guide:
- shield: fact-checkers, trust/safety tools, verification services
- newspaper: media companies, news outlets, journalism tools
- building: institutions, nonprofits, government bodies, established organizations
- circle: rating systems, scoring platforms, review tools
- globe: global/independent organizations, international NGOs
- code: developer tools, APIs, technical platforms
- chart: analytics, data intelligence, market research
- bolt: real-time tools, fast/live data platforms, AI-powered services

Rules:
- Return between 3 and 6 items — only real companies found in the search results, never invented ones
- Skip any result that is clearly not a company (blog posts, forum threads, generic articles)
- If fewer than 3 real companies are found, return however many exist — never fabricate
- icon_type must be exactly one of the 8 values listed — nothing else
- Never return markdown, asterisks, numbered lists, or prose outside the JSON array
"""


def _format_search_results(results: list[dict]) -> str:
    lines = []
    for index, result in enumerate(results, start=1):
        lines.append(
            "\n".join(
                [
                    f"Result {index}:",
                    f"Title: {result.get('title', '')}",
                    f"Link: {result.get('link', '')}",
                    f"Snippet: {result.get('snippet', '')}",
                ]
            )
        )
    return "\n\n".join(lines)


def _parse_response(raw: str) -> list:
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            parts = clean.split("```")
            clean = parts[1] if len(parts) > 1 else clean
            if clean.startswith("json"):
                clean = clean[4:]
        parsed = json.loads(clean.strip())
        if isinstance(parsed, list):
            return parsed
        return []
    except (json.JSONDecodeError, IndexError, ValueError):
        return []


def _sanitize_item(item: dict) -> dict:
    icon_type = item.get("icon_type", "globe")
    if icon_type not in VALID_ICON_TYPES:
        icon_type = "globe"

    return {
        "company_name": str(item.get("company_name", "Unknown"))[:100],
        "category_tag": str(item.get("category_tag", ""))[:30],
        "description": str(item.get("description", ""))[:300],
        "url": str(item.get("url", "")),
        "icon_type": icon_type,
    }


def search_similar_startups(idea: str) -> list[dict]:
    query = f"{idea} startup competitor alternative"
    results = search_google(query)

    if not results:
        return []

    prompt = SIMILAR_STARTUPS_PROMPT.format(
        idea=idea,
        search_results=_format_search_results(results),
    )

    model = settings.AGENT_MODELS["tool_light"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    raw = call_llm(prompt, model=model, fallback_model=fallback)

    items = _parse_response(raw)
    return [_sanitize_item(item) for item in items[:6] if isinstance(item, dict)]
