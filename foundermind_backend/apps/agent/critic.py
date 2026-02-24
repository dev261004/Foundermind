from integrations.gemini_client import generate_text
import json


class CriticAgent:
    """
    Reviews analysis results and evaluates quality.
    Can suggest re-execution if needed.
    """

    def review(self, idea: str, results: dict):

        prompt = f"""
You are an AI startup analysis critic.

Evaluate the quality of the following startup analysis.

Startup Idea:
"{idea}"

Analysis Results:
{results}

Tasks:
1. Identify missing sections
2. Identify weak reasoning
3. Detect generic SWOT content
4. Detect inconsistent conclusions
5. Decide if re-execution is required

Return JSON:

{{
  "quality_score": 1-10,
  "issues_found": ["..."],
  "needs_rerun": true/false,
  "reason": "short explanation"
}}
"""

        response = generate_text(prompt)

        try:
            critique = json.loads(response)
        except Exception:
            critique = {
                "quality_score": 5,
                "issues_found": ["Critic parsing failed"],
                "needs_rerun": False,
                "reason": "Invalid JSON from LLM"
            }

        return critique
