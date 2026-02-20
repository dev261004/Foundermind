import os
from serpapi import GoogleSearch
from dotenv import load_dotenv

load_dotenv()


def search_google(query: str, num_results: int = 5):
    """
    SerpAPI search wrapper.
    """
    params = {
        "engine": "google",
        "q": query,
        "api_key": os.getenv("SERPAPI_KEY"),
        "num": num_results
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        return results.get("organic_results", [])
    except Exception as e:
        print(f"SerpAPI error: {e}")
        return []