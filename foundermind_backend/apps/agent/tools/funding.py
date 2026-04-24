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


def search_funding_info(idea: str) -> str:
    query = f"{idea} startup funding site:crunchbase.com"
    results = search_google(query)

    if not results:
        return "No funding info found."

    prompt = f"""
You are summarizing funding research for a startup idea.

Using only the search results below, extract the most relevant funding signals,
recent fundraises, and investor references. Keep the answer concise and cite the
links you relied on.

Startup Idea:
{idea}

Search Results:
{_format_search_results(results)}
"""

    model = settings.AGENT_MODELS["tool_light"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    return call_llm(
        prompt,
        model=model,
        fallback_model=fallback,
    )
