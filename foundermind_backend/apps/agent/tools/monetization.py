from django.conf import settings

from integrations.gemini_client import call_llm


def generate_monetization_strategy(idea: str) -> str:
    prompt = f"""
You are a startup business advisor.

Suggest 3-5 monetization strategies for the following startup idea and explain why each is relevant.

Startup Idea: "{idea}"

Format the output like this:

**Monetization Strategies:**
1. Strategy name — short explanation
2. ...
"""
    model = settings.AGENT_MODELS["tool_heavy"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    return call_llm(
        prompt,
        model=model,
        fallback_model=fallback,
    )
