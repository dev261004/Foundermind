from integrations.gemini_client import generate_text


def is_technical_startup(idea: str) -> bool:
    prompt = f"""
Is the following startup idea a technical or software-based product?

Startup Idea: "{idea}"

Respond with 'Yes' or 'No' only.
"""
    response = generate_text(prompt)
    return "yes" in response.lower()


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
    return generate_text(prompt)