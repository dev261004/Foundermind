from integrations.gemini_client import generate_text


def generate_swot_analysis(
    idea: str,
    similar_results: str,
    market_data: str,
    funding_info: str,
    monetization: str,
    customer_profile: str
) -> str:

    prompt = f"""
You are a startup analyst.

Startup Idea: "{idea}"

Here are similar startups:
{similar_results}

Here is some market research data:
{market_data}

Here is some funding info:
{funding_info}

Here are potential monetization strategies:
{monetization}

Here is the ideal customer profile:
{customer_profile}

Now do a detailed SWOT analysis.

Respond in this format:
**Strengths:**
- ...
**Weaknesses:**
- ...
**Opportunities:**
- ...
**Threats:**
- ...
"""

    return generate_text(prompt)