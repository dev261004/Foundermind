from integrations.gemini_client import generate_text
import json
import re


class CriticAgent:

    AVAILABLE_TOOLS = [
        "search_similar_startups",
        "search_market_data",
        "search_funding_info",
        "generate_monetization_strategy",
        "generate_customer_profile",
        "suggest_tech_stack",
        "generate_swot_analysis"
    ]

    def review(self, idea: str, results: dict):

        tool_list_str = "\n".join(self.AVAILABLE_TOOLS)

        prompt = f"""
You are an expert startup validation auditor.

Startup Idea:
{idea}

Evaluate each section below for:

- Relevance to idea
- Specificity (not generic)
- Logical consistency
- Completeness

Sections:
Similar Startups:
{results.get("similar_startups")}

Market Data:
{results.get("market_data")}

Funding Info:
{results.get("funding_info")}

Monetization:
{results.get("monetization")}

SWOT:
{results.get("swot")}

You may ONLY suggest rerun_tools from this exact list:

{tool_list_str}

DO NOT invent new tool names.
DO NOT rename tools.
If a section is weak, map it to the correct tool from the list above.

Tool mapping guidance:
- Similar Startups → search_similar_startups
- Market Data → search_market_data
- Funding Info → search_funding_info
- Monetization → generate_monetization_strategy
- Customer Profile → generate_customer_profile
- SWOT → generate_swot_analysis

Return STRICT JSON only:

{{
  "overall_score": 1-10,
  "section_scores": {{
    "similar_startups": 1-10,
    "market_data": 1-10,
    "funding_info": 1-10,
    "monetization": 1-10,
    "swot": 1-10
  }},
  "issues_found": ["..."],
  "rerun_tools": ["tool_name_if_needed"],
  "needs_rerun": true/false
}}

Important:
- If funding info is unrelated → suggest search_funding_info
- If market lacks numbers → suggest search_market_data
- If SWOT is generic → suggest generate_swot_analysis
"""

        response = generate_text(prompt)

        try:
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if json_match:
                critique = json.loads(json_match.group())
            else:
                raise ValueError("No JSON found")

            # 🔒 Safety filter: enforce allowed tools only
            critique["rerun_tools"] = [
                tool for tool in critique.get("rerun_tools", [])
                if tool in self.AVAILABLE_TOOLS
            ]

        except Exception:
            critique = {
                "overall_score": 6,
                "section_scores": {},
                "issues_found": ["Critic parsing failed"],
                "rerun_tools": [],
                "needs_rerun": False
            }

        return critique