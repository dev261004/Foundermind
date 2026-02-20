from integrations.gemini_client import generate_text


def generate_customer_profile(idea: str) -> str:
    prompt = f"""
You are a startup market strategist.

Based on the startup idea below, generate an Ideal Customer Profile (ICP) in this format:

**Ideal Customer Profile:**
- Age:
- Profession:
- Needs:
- Pain Points:
- Buying Behavior:

Startup Idea: "{idea}"
"""
    return generate_text(prompt)