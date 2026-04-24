import datetime
import time

from apps.agent.tools.search import search_similar_startups
from apps.agent.tools.market import search_market_data
from apps.agent.tools.funding import search_funding_info
from apps.agent.tools.monetization import generate_monetization_strategy
from apps.agent.tools.customer import generate_customer_profile
from apps.agent.tools.techstack import is_technical_startup, suggest_tech_stack
from apps.agent.tools.swot import generate_swot_analysis


class ToolExecutor:
    """
    Executes tools dynamically based on planner output.
    """

    INTER_TOOL_GAP_SECONDS = 3

    RESULT_KEY_MAP = {
        "search_similar_startups": "similar_startups",
        "search_market_data": "market_data",
        "search_funding_info": "funding_info",
        "generate_monetization_strategy": "monetization",
        "generate_customer_profile": "customer_profile",
        "suggest_tech_stack": "tech_stack",
        "generate_swot_analysis": "swot",
    }

    def _timestamp(self) -> str:
        return datetime.datetime.utcnow().isoformat()

    def _append_result(self, results: dict, tool_name: str, output: str) -> None:
        result_key = self.RESULT_KEY_MAP.get(tool_name)
        if result_key:
            results[result_key] = output

    def _restore_results(self, checkpoints: list[dict] | None) -> dict:
        restored = {}
        for entry in checkpoints or []:
            tool_name = entry.get("tool")
            if entry.get("status") != "success":
                continue
            if tool_name not in self.RESULT_KEY_MAP:
                continue
            if entry.get("result") is None:
                continue
            self._append_result(restored, tool_name, entry["result"])
        return restored

    def _find_checkpoint(self, tool_name: str, checkpoints: list[dict] | None):
        for entry in reversed(checkpoints or []):
            if entry.get("tool") != tool_name:
                continue
            if entry.get("status") != "success":
                continue
            if entry.get("result") is None:
                continue
            return entry
        return None

    def execute_with_plan(
        self,
        idea: str,
        plan: dict,
        log_callback=None,
        update_log_callback=None,
        checkpoints: list[dict] | None = None,
        use_checkpoints: bool = True,
    ):

        execution_log = []
        results = self._restore_results(checkpoints)

        def append_log(entry: dict):
            execution_log.append(entry)
            if log_callback:
                log_callback(entry)

        def update_started_entry(tool_name: str, updates: dict):
            for entry in reversed(execution_log):
                if entry.get("tool") != tool_name:
                    continue
                if entry.get("status") != "started":
                    continue
                entry.update(updates)
                break

            if update_log_callback:
                update_log_callback(tool_name=tool_name, updates=updates)

        steps = plan.get("steps", [])

        for index, step in enumerate(steps):
            tool_name = step.get("tool")
            executed_tool = False
            checkpoint_entry = (
                self._find_checkpoint(tool_name, checkpoints)
                if use_checkpoints
                else None
            )

            if checkpoint_entry:
                self._append_result(results, tool_name, checkpoint_entry["result"])
                append_log({
                    "tool": tool_name,
                    "status": "skipped",
                    "reason": "checkpoint_found",
                    "message": f"Skipping {tool_name} - checkpoint found",
                    "result": checkpoint_entry["result"],
                    "model_used": checkpoint_entry.get("model_used"),
                    "timestamp": self._timestamp(),
                })
            else:
                executed_tool = True
                append_log({
                    "tool": tool_name,
                    "status": "started",
                    "message": f"Starting {tool_name}.",
                    "timestamp": self._timestamp(),
                })
                try:
                    if tool_name == "search_similar_startups":
                        output = search_similar_startups(idea)

                    elif tool_name == "search_market_data":
                        output = search_market_data(idea)

                    elif tool_name == "search_funding_info":
                        output = search_funding_info(idea)

                    elif tool_name == "generate_monetization_strategy":
                        output = generate_monetization_strategy(idea)

                    elif tool_name == "generate_customer_profile":
                        output = generate_customer_profile(idea)

                    elif tool_name == "suggest_tech_stack":
                        if is_technical_startup(idea):
                            output = suggest_tech_stack(idea)
                        else:
                            output = "Not a technical startup."

                    elif tool_name == "generate_swot_analysis":
                        output = generate_swot_analysis(
                            idea,
                            results.get("similar_startups", ""),
                            results.get("market_data", ""),
                            results.get("funding_info", ""),
                            results.get("monetization", ""),
                            results.get("customer_profile", ""),
                        )
                    else:
                        raise ValueError("Unknown tool")

                    output_text = str(output)
                    self._append_result(results, tool_name, output_text)
                    update_started_entry(tool_name, {
                        "status": "success",
                        "result": output_text,
                        "model_used": getattr(output, "model_used", None),
                        "message": (
                            f"{tool_name} completed using "
                            f"{getattr(output, 'model_used', 'no-model')}"
                        ),
                        "completed_at": self._timestamp(),
                    })
                except Exception as e:
                    update_started_entry(tool_name, {
                        "status": "failed",
                        "result": None,
                        "error": str(e),
                        "error_type": type(e).__name__,
                        "message": f"{tool_name} failed: {e} - continuing pipeline",
                        "completed_at": self._timestamp(),
                    })

            if executed_tool and index < len(steps) - 1:
                append_log({
                    "type": "inter_tool_delay",
                    "after_tool": tool_name,
                    "delay_seconds": self.INTER_TOOL_GAP_SECONDS,
                    "timestamp": self._timestamp(),
                })
                time.sleep(self.INTER_TOOL_GAP_SECONDS)

        return {
            "results": results,
            "execution_log": execution_log
        }
