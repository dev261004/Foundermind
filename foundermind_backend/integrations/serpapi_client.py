import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
SERPAPI_TIMEOUT_SECONDS = 30


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
        response = requests.get(
            "https://serpapi.com/search.json",
            params=params,
            timeout=SERPAPI_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        results = response.json()
        return results.get("organic_results", [])
    except (requests.RequestException, ValueError) as e:
        logger.warning("SerpAPI request failed query=%s error=%s", query, e)
        return []
