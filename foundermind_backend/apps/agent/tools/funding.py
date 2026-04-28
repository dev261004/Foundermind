from django.conf import settings

from integrations.gemini_client import call_llm
from integrations.serpapi_client import search_google


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


import json

def search_funding_info(idea: str) -> list[dict]:
    query = f"{idea} startup funding site:crunchbase.com"
    results = search_google(query)

    if not results:
        return []

    prompt = f"""
Based on the following search results about startup funding, provide a summary of the funding landscape for a startup doing: {idea}

Return the data STRICTLY as a JSON array of objects. Do not include any other text or markdown formatting. The array should contain objects with the following keys:
- company_name: string
- funding_amount: string
- funding_stage: string (must be exactly one of: Pre-Seed, Seed, Series A, Series B, Series C, Series D+, Unknown)
- description: string
- investors: array of strings
- relevance_score: integer between 0 and 100

You must filter the results such that you return a maximum of 5 entries, and skip any results with a relevance score below 40.

Search Results:
{_format_search_results(results)}
"""

    model = settings.AGENT_MODELS["tool_light"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    response_text = call_llm(
        prompt,
        model=model,
        fallback_model=fallback,
    )

    try:
        # Strip markdown formatting if any
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:].strip()
        if clean_text.startswith("```"):
            clean_text = clean_text[3:].strip()
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3].strip()

        data = json.loads(clean_text)
        if isinstance(data, list):
            return data
        return []
    except Exception:
        return []
