from integrations.serpapi_client import search_google


def search_similar_startups(idea: str) -> str:
    query = f"{idea} startup"
    results = search_google(query)

    if not results:
        return "No similar startups found."

    return "\n".join([
        f"- {r.get('title', '')}\n  {r.get('link', '')}"
        for r in results
    ])