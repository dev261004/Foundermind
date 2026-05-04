import json
import re

from django.conf import settings

from integrations.gemini_client import call_llm


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

    REQUIRED_SECTIONS = [
        "similar_startups",
        "market_data",
        "funding_info",
        "monetization",
        "customer_profile",
        "tech_stack",
        "swot"
    ]

    DEFAULT_PASSING_SCORE = 6

    def _coerce_score(self, value):
        try:
            score = float(value)
        except (TypeError, ValueError):
            score = self.DEFAULT_PASSING_SCORE
        return max(1, min(10, score))

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

Quantitative Market Model (if available):
{results.get("market_quantitative_model")}

Funding Info:
{results.get("funding_info")}

Monetization:
{results.get("monetization")}

Customer Profile:
{results.get("customer_profile")}

Tech Stack:
{results.get("tech_stack")}

SWOT:
{results.get("swot")}

You may ONLY suggest rerun_tools from this exact list:

{tool_list_str}

DO NOT invent new tool names.
DO NOT rename tools.

Tool mapping guidance:
- Similar Startups → search_similar_startups
- Market Data → search_market_data
- Funding Info → search_funding_info
- Monetization → generate_monetization_strategy
- Customer Profile → generate_customer_profile
- Tech Stack → suggest_tech_stack
- SWOT → generate_swot_analysis

Return STRICT JSON only:

{{
  "overall_score": 1-10,
  "section_scores": {{
    "similar_startups": 1-10,
    "market_data": 1-10,
    "funding_info": 1-10,
    "monetization": 1-10,
    "customer_profile": 1-10,
    "tech_stack": 1-10,
    "swot": 1-10
  }},
  "issues_found": ["..."],
  "rerun_tools": ["tool_name_if_needed"],
  "needs_rerun": true/false
}}

Rules:
- If funding info is unrelated → suggest search_funding_info
- If market lacks numeric data → suggest search_market_data
- If customer profile is generic or not actionable → suggest generate_customer_profile
- If tech stack is generic for a technical startup → suggest suggest_tech_stack
- If the startup is non-technical and tech_stack is empty, do not penalize it or request rerun
- If quantitative model exists:
    - Validate TAM size realism
    - Validate CAGR reasonableness (2%–40% typical range)
    - If opportunity_score inconsistent with TAM/CAGR → penalize
- If SWOT is generic → suggest generate_swot_analysis
"""

        model = settings.AGENT_MODELS["critic"]
        fallback = settings.AGENT_MODELS["fallback_gemma"]
        response = call_llm(prompt, model=model, fallback_model=fallback)

        try:
            json_match = re.search(r"\{.*\}", response, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found")

            critique = json.loads(json_match.group())

            # Enforce allowed tools only.
            critique["rerun_tools"] = [
                tool for tool in critique.get("rerun_tools", [])
                if tool in self.AVAILABLE_TOOLS
            ]

            # Enforce section completeness and score bounds.
            section_scores = critique.get("section_scores", {})
            normalized_scores = {}
            for section in self.REQUIRED_SECTIONS:
                normalized_scores[section] = self._coerce_score(
                    section_scores.get(section, self.DEFAULT_PASSING_SCORE)
                )
            critique["section_scores"] = normalized_scores
            critique["overall_score"] = self._coerce_score(
                critique.get("overall_score", self.DEFAULT_PASSING_SCORE)
            )

            if critique.get("needs_rerun") and not critique["rerun_tools"]:
                critique["needs_rerun"] = False
            elif critique["rerun_tools"]:
                critique["needs_rerun"] = True

        except Exception:
            critique = {
                "overall_score": 6,
                "section_scores": {
                    s: self.DEFAULT_PASSING_SCORE for s in self.REQUIRED_SECTIONS
                },
                "issues_found": ["Critic parsing failed"],
                "rerun_tools": [],
                "needs_rerun": False
            }

        return critique, getattr(
            response,
            "model_used",
            model,
        )
