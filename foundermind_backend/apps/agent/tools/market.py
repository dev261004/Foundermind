from integrations.gemini_client import generate_text
import re
import json


def extract_structured_market_data(raw_text: str):
    """
    Attempts to extract structured numeric data from LLM market response.
    """

    try:
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception:
        pass

    # Fallback numeric extraction using regex
    numbers = re.findall(r"\$?(\d+\.?\d*)\s?(billion|million)?", raw_text.lower())

    if len(numbers) >= 2:
        try:
            current = float(numbers[0][0])
            future = float(numbers[1][0])
            return {
                "market_size_current_billion_usd": current,
                "market_size_future_billion_usd": future,
                "forecast_years": 5
            }
        except:
            pass

    return None


def search_market_data(idea: str):

    prompt = f"""
Provide market research for this startup idea.

Return descriptive analysis AND include structured JSON in this format:

{{
  "market_size_current_billion_usd": number,
  "market_size_future_billion_usd": number,
  "forecast_years": number,
  "reported_cagr_percent": number,
  "source": "source_name"
}}

Startup Idea:
{idea}
"""

    response = generate_text(prompt)

    return response