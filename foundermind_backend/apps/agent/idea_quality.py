import json
import logging

from django.conf import settings
from integrations.gemini_client import call_llm

logger = logging.getLogger(__name__)

SAFE_DEFAULT_QUALITY = {
    "specificity": 1,
    "problem_clarity": 1,
    "differentiation": 0,
    "sufficient_length": 0,
    "total_score": 2,
    "missing_signals": ["differentiation", "sufficient_length"],
    "suggested_questions": [],
}


def check_idea_quality(title: str, description: str) -> dict:
    """
    Evaluate the combined idea text against 4 quality criteria.
    Returns a dict with total_score (0-4), missing_signals, and suggested_questions.
    On any failure, returns a safe default with total_score=2 so the pipeline is never blocked.
    """
    # Truncate description to AI max before sending to LLM
    desc = (description or "").strip()[:settings.IDEA_DESCRIPTION_AI_MAX_CHARS]
    combined = f"Title: {title}"
    if desc:
        combined += f"\nDescription: {desc}"

    prompt = f"""You are an idea quality evaluator. Evaluate the following startup idea against exactly 4 criteria. Return ONLY valid JSON, no markdown, no code blocks, no explanation.

Idea:
{combined}

Criteria (each scores 0 or 1):
1. specificity — Does it mention a specific target customer, market segment, or geography? Generic words like "people" or "users" score 0. Specific words like "corporate offices", "solo founders", "hedge fund managers", "India" score 1.
2. problem_clarity — Is there a clear problem being solved? Vague intent like "I want to sell X" scores 0. A described pain point or inefficiency scores 1.
3. differentiation — Is there any hint of what makes this different or the business model? Words like "subscription", "AI-powered", "B2B", "marketplace", "automated" count. Completely generic descriptions score 0.
4. sufficient_length — After mentally stripping filler words, are there at least 30 meaningful words of substance? Score 1 if yes, 0 if not.

Return this exact JSON structure:
{{"specificity": 0, "problem_clarity": 0, "differentiation": 0, "sufficient_length": 0, "total_score": 0, "missing_signals": ["specificity", "problem_clarity"], "suggested_questions": ["Who specifically will use this?"]}}

Rules for suggested_questions:
- Generate 1-3 specific, actionable questions based on which signals scored 0
- If specificity=0: ask about specific target customers (e.g. "Who specifically will use this? (e.g. corporate offices, solo founders, students in urban areas)")
- If problem_clarity=0: ask about the problem (e.g. "What problem does this solve today that isn't solved well by existing options?")
- If differentiation=0: ask about business model and differentiation (e.g. "How does it make money, and what makes it different from existing solutions? (e.g. subscription, B2B contract, marketplace)")
- If sufficient_length=0: ask for more detail (e.g. "Can you describe the idea in more detail — who is the customer, what's the core product, and how will it generate revenue?")

Return ONLY the JSON object."""

    try:
        response = call_llm(
            prompt,
            model=settings.AGENT_MODELS["tool_light"],
            fallback_model=settings.AGENT_MODELS["fallback_gemma"],
        )
        text = str(response).strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()

        result = json.loads(text)

        # Validate required keys
        required_keys = {"specificity", "problem_clarity", "differentiation", "sufficient_length", "total_score", "missing_signals", "suggested_questions"}
        if not required_keys.issubset(result.keys()):
            logger.warning("Quality check response missing keys, using safe default")
            return SAFE_DEFAULT_QUALITY

        # Ensure total_score is an int 0-4
        result["total_score"] = max(0, min(4, int(result["total_score"])))

        return result

    except Exception as exc:
        logger.warning("Quality check failed (%s), using safe default", exc)
        return SAFE_DEFAULT_QUALITY


def refine_description(title: str, description: str) -> str:
    """
    Rewrite the description into a clear, structured paragraph.
    On failure, returns the original description unchanged.
    """
    if not description or not description.strip():
        return description or ""

    # Truncate description to AI max before sending to LLM
    desc = description.strip()[:settings.IDEA_DESCRIPTION_AI_MAX_CHARS]

    prompt = f"""Rewrite the following startup idea description into a single clear paragraph that:
- Preserves all factual information from the original — never invent details
- Fixes grammar and spelling
- Makes the target customer, problem, and solution explicit
- Removes filler and redundant phrases
- Is between 100-200 words
- Is written in third person business language

Title: {title}
Original description: {desc}

Return ONLY the refined description paragraph. No explanation, no prefix like "Here is the refined description:", no markdown. Just the paragraph."""

    try:
        response = call_llm(
            prompt,
            model=settings.AGENT_MODELS["tool_light"],
            fallback_model=settings.AGENT_MODELS["fallback_gemma"],
        )
        refined = str(response).strip()

        if not refined:
            logger.warning("Refiner returned empty, using original description")
            return description

        return refined

    except Exception as exc:
        logger.warning("Description refinement failed (%s), using original", exc)
        return description
