from integrations.gemini_client import generate_text
import json


class PlannerAgent:
    """
    Advanced planner that dynamically decides
    which tools to run and in what order.
    """

    def create_plan(self, idea: str):

        prompt = f"""
You are an autonomous startup analysis planner.

Given the startup idea below, decide:

1. Which analysis tools should be executed
2. In what order
3. Whether any step depends on previous output

Available tools:
- search_similar_startups
- search_market_data
- search_funding_info
- generate_monetization_strategy
- generate_customer_profile
- suggest_tech_stack
- generate_swot_analysis

Return a JSON response in this format:

{{
  "steps": [
    {{
      "step": 1,
      "tool": "tool_name",
      "depends_on": []
    }}
  ]
}}

Startup Idea:
"{idea}"

Rules:
- Always gather research before SWOT
- SWOT must be last
- Tech stack only if technical
- Be logical and strategic
"""

        response = generate_text(prompt)

        try:
            plan = json.loads(response)
        except Exception:
            # Fallback to default plan if LLM returns bad JSON
            plan = {
                "steps": [
                    {"step": 1, "tool": "search_similar_startups", "depends_on": []},
                    {"step": 2, "tool": "search_market_data", "depends_on": []},
                    {"step": 3, "tool": "search_funding_info", "depends_on": []},
                    {"step": 4, "tool": "generate_monetization_strategy",
                        "depends_on": []},
                    {"step": 5, "tool": "generate_customer_profile", "depends_on": []},
                    {"step": 6, "tool": "generate_swot_analysis", "depends_on": []},
                ]
            }

        return plan
