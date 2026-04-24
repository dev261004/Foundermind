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


def search_similar_startups(idea: str) -> str:
    query = f"{idea} startup"
    results = search_google(query)

    if not results:
        return "No similar startups found."

    prompt = f"""
You are summarizing web research about similar startups.

Using only the search results below, list the most relevant similar startups
for this idea. Keep the answer concise and include the reference link for each.

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
