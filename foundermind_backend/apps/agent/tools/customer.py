from django.conf import settings

from integrations.gemini_client import call_llm


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
    model = settings.AGENT_MODELS["tool_light"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    return call_llm(
        prompt,
        model=model,
        fallback_model=fallback,
    )
