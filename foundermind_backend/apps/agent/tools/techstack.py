from django.conf import settings

from integrations.gemini_client import call_llm


TECHNICAL_HINTS = (
    "ai",
    "api",
    "app",
    "automation",
    "cloud",
    "data",
    "developer",
    "platform",
    "saas",
    "software",
    "web",
)


def is_technical_startup(idea: str) -> bool:
    idea_lower = idea.lower()
    return any(keyword in idea_lower for keyword in TECHNICAL_HINTS)


def suggest_tech_stack(idea: str) -> str:
    prompt = f"""
You are a senior software architect.

Based on the startup idea below, suggest a relevant tech stack with reasoning.

Startup Idea: "{idea}"

Respond in this format:
- Frontend:
- Backend:
- Database:
- Hosting / DevOps:
- Optional Tools:
"""
    model = settings.AGENT_MODELS["tool_light"]
    fallback = settings.AGENT_MODELS["fallback_gemma"]
    return call_llm(
        prompt,
        model=model,
        fallback_model=fallback,
    )
