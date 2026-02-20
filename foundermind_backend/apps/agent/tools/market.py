from integrations.serpapi_client import search_google


def search_market_data(idea: str) -> str:
    query = f"{idea} market size 2024"
    results = search_google(query)

    if not results:
        return "No market data found."

    return "\n".join([
        f"- {r.get('title', '')}\n  {r.get('link', '')}"
        for r in results
    ])

    