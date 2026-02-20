from integrations.serpapi_client import search_google


def search_funding_info(idea: str) -> str:
    query = f"{idea} startup funding site:crunchbase.com"
    results = search_google(query)

    if not results:
        return "No funding info found."

    return "\n".join([
        f"- {r.get('title', '')}\n  {r.get('link', '')}"
        for r in results
    ])