import json

from django.conf import settings

from integrations.gemini_client import call_llm


class ReporterAgent:
    UNAVAILABLE_NOTE = "[Section unavailable — could not be retrieved]"

    def generate_report(self, idea: str, results: dict, execution_log: list[dict]):
        successful_tools = [
            {
                "tool": entry.get("tool"),
                "result": entry.get("result"),
                "model_used": entry.get("model_used"),
            }
            for entry in execution_log
            if entry.get("tool") and entry.get("status") == "success"
        ]
        failed_tools = [
            {
                "tool": entry.get("tool"),
                "error": entry.get("error"),
                "error_type": entry.get("error_type"),
            }
            for entry in execution_log
            if entry.get("tool") and entry.get("status") == "failed"
        ]

        normalized_results = {
            key: value if value else self.UNAVAILABLE_NOTE
            for key, value in results.items()
        }

        prompt = f"""
You are a startup analysis reporter. Some sections may be missing due to API
failures. For sections where data exists, provide full analysis. For missing
sections, write a clear note: "{self.UNAVAILABLE_NOTE}"
Never fabricate data for missing sections. Always synthesize what you have.

Create a concise but useful founder-facing summary grounded in the available
data below. If all tools failed, clearly state that no reliable data was
available and recommend retrying later.

Return plain text only.

Startup Idea:
{idea}

Successful Tool Data:
{json.dumps(successful_tools, indent=2, default=str)}

Failed Tools:
{json.dumps(failed_tools, indent=2, default=str)}

Normalized Section Data:
{json.dumps(normalized_results, indent=2, default=str)}
"""

        model = settings.AGENT_MODELS["reporter"]
        fallback = settings.AGENT_MODELS["fallback_gemma"]
        response = call_llm(prompt, model=model, fallback_model=fallback)

        return {
            "summary": str(response),
            "model_used": getattr(
                response,
                "model_used",
                model,
            ),
            "successful_tools": successful_tools,
            "failed_tools": failed_tools,
        }
