import json

from django.conf import settings

from integrations.gemini_client import call_llm
from integrations.serpapi_client import search_google


VALID_FUNDING_STAGES = {
    "Pre-Seed",
    "Seed",
    "Series A",
    "Series B",
    "Series C",
    "Series D+",
    "Grant",
    "Undisclosed",
}
GENERIC_COMPANY_NAMES = {
    "",
    "unknown",
    "funding activity signal",
    "company",
    "startup",
}


FUNDING_INFO_PROMPT = """
You are a startup funding research analyst.

Based only on the search results below, identify the most relevant funding signals for the startup idea.

Startup Idea: "{idea}"

Search Results:
{search_results}

Return ONLY a valid JSON array. No markdown, no code blocks, no backticks, and no prose.

Each object must contain exactly these fields:
{{
  "company_name": "Clean company name, no markdown, no asterisks",
  "funding_amount": "Formatted string like $32.5M, $5M, or Undisclosed. Never a raw number",
  "funding_stage": "Exactly one of: Pre-Seed, Seed, Series A, Series B, Series C, Series D+, Grant, Undisclosed",
  "description": "One clean sentence about the company and why this funding is relevant. No markdown or citation markers like [Result 1]",
  "investors": ["Investor name or investor type", "Second investor", "Third investor"],
  "relevance_score": 0,
  "url": "Most relevant source URL from the search results, or empty string if not found"
}}

Rules:
- Skip entries with relevance_score below 40
- Skip entries where company_name is unclear or generic preamble text
- Return a maximum of 5 entries
- If nothing relevant is found, return []
- funding_stage must be exactly one of the 8 allowed values
- investors must be an array of strings with at most 3 items
- Never include any fields other than the 7 specified above

Relevance score guide:
- 85-100 = direct competitor or identical space
- 60-84 = adjacent market
- 40-59 = loosely related
- Below 40 = skip entirely
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
    except (json.JSONDecodeError, IndexError, TypeError, ValueError):
        return []


def _sanitize_item(item: dict) -> dict:
    funding_stage = str(item.get("funding_stage", "Undisclosed")).strip()
    if funding_stage not in VALID_FUNDING_STAGES:
        funding_stage = "Undisclosed"

    investors = item.get("investors", [])
    if not isinstance(investors, list):
        investors = []

    sanitized_investors = [
        str(investor).strip()[:100]
        for investor in investors
        if str(investor).strip()
    ][:3]

    raw_relevance = item.get("relevance_score", 0)
    try:
        relevance_score = int(raw_relevance)
    except (TypeError, ValueError):
        relevance_score = 0
    relevance_score = max(0, min(100, relevance_score))

    return {
        "company_name": str(item.get("company_name", "Unknown"))[:100],
        "funding_amount": str(item.get("funding_amount", "Undisclosed"))[:50],
        "funding_stage": funding_stage,
        "description": str(item.get("description", ""))[:400],
        "investors": sanitized_investors,
        "relevance_score": relevance_score,
        "url": str(item.get("url", "")),
    }


def _is_valid_item(item: dict) -> bool:
    company_name = item.get("company_name", "").strip().lower()
    if company_name in GENERIC_COMPANY_NAMES:
        return False
    return item.get("relevance_score", 0) >= 40


def search_funding_info(idea: str) -> list[dict]:
    query = f"{idea} startup funding round investors"
    results = search_google(query)

    if not results:
        return []

    prompt = FUNDING_INFO_PROMPT.format(
        idea=idea,
        search_results=_format_search_results(results),
    )

    model = settings.AGENT_MODELS["tool_light"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    raw = call_llm(prompt, model=model, fallback_model=fallback)

    items = _parse_response(raw)
    sanitized_items = [
        _sanitize_item(item)
        for item in items[:5]
        if isinstance(item, dict)
    ]
    return [item for item in sanitized_items if _is_valid_item(item)]
