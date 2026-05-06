import concurrent.futures
import datetime
import json
import threading

from apps.agent.tools.similar_startups import search_similar_startups
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

    MAX_PARALLEL_TOOLS = 3
    PARALLEL_WAVE_TOOLS = {
        "search_similar_startups",
        "search_market_data",
        "search_funding_info",
        "generate_monetization_strategy",
        "generate_customer_profile",
        "suggest_tech_stack",
    }

    RESULT_KEY_MAP = {
        "search_similar_startups": "similar_startups",
        "search_market_data": "market_data",
        "search_funding_info": "funding_info",
        "generate_monetization_strategy": "monetization",
        "generate_customer_profile": "customer_profile",
        "suggest_tech_stack": "tech_stack",
        "generate_swot_analysis": "swot",
    }
    STRUCTURED_RESULT_KEYS = {
        "similar_startups",
        "funding_info",
        "monetization",
        "customer_profile",
        "tech_stack",
        "swot",
    }

    def _timestamp(self) -> str:
        return datetime.datetime.utcnow().isoformat()

    def _append_result(self, results: dict, tool_name: str, output) -> None:
        result_key = self.RESULT_KEY_MAP.get(tool_name)
        if result_key:
            results[result_key] = output

    def _serialize_result(self, tool_name: str, output) -> str:
        result_key = self.RESULT_KEY_MAP.get(tool_name)
        if result_key in self.STRUCTURED_RESULT_KEYS:
            return json.dumps(output, ensure_ascii=False)
        return str(output)

    def _deserialize_result(self, tool_name: str, output):
        result_key = self.RESULT_KEY_MAP.get(tool_name)
        if result_key not in self.STRUCTURED_RESULT_KEYS or not isinstance(output, str):
            return output

        try:
            return json.loads(output)
        except (json.JSONDecodeError, TypeError, ValueError):
            return output

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
            self._append_result(
                restored,
                tool_name,
                self._deserialize_result(tool_name, entry["result"]),
            )
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

    def _run_tool(self, idea: str, tool_name: str, results: dict | None = None):
        if tool_name == "search_similar_startups":
            return search_similar_startups(idea)

        if tool_name == "search_market_data":
            return search_market_data(idea)

        if tool_name == "search_funding_info":
            return search_funding_info(idea)

        if tool_name == "generate_monetization_strategy":
            return generate_monetization_strategy(idea)

        if tool_name == "generate_customer_profile":
            return generate_customer_profile(idea)

        if tool_name == "suggest_tech_stack":
            if is_technical_startup(idea):
                return suggest_tech_stack(idea)
            return {}

        if tool_name == "generate_swot_analysis":
            current_results = results or {}
            return generate_swot_analysis(
                idea,
                current_results.get("similar_startups", ""),
                current_results.get("market_data", ""),
                current_results.get("funding_info", ""),
                current_results.get("monetization", ""),
                current_results.get("customer_profile", ""),
            )

        raise ValueError("Unknown tool")

    def execute_with_plan(
        self,
        idea: str,
        plan: dict,
        log_callback=None,
        update_log_callback=None,
        checkpoints: list[dict] | None = None,
        use_checkpoints: bool = True,
        force_tools: list[str] | set[str] | None = None,
        iteration: int | None = None,
        should_abort=None,
    ):

        execution_log = []
        results = self._restore_results(checkpoints)
        forced_tool_set = set(force_tools or []) if force_tools is not None else None
        state_lock = threading.Lock()
        parallel_executor = None
        parallel_futures: dict[concurrent.futures.Future, str] = {}

        def append_log(entry: dict):
            if iteration is not None:
                entry.setdefault("iteration", iteration)
            with state_lock:
                execution_log.append(entry)
            if log_callback:
                log_callback(entry)

        def update_started_entry(tool_name: str, updates: dict):
            with state_lock:
                for entry in reversed(execution_log):
                    if entry.get("tool") != tool_name:
                        continue
                    if entry.get("status") != "started":
                        continue
                    entry.update(updates)
                    break

            if update_log_callback:
                update_log_callback(tool_name=tool_name, updates=updates)

        def append_result(tool_name: str, output) -> None:
            with state_lock:
                self._append_result(results, tool_name, output)

        def should_stop() -> bool:
            return bool(should_abort and should_abort())

        def flush_parallel_tools() -> None:
            nonlocal parallel_executor, parallel_futures

            if not parallel_futures:
                return

            futures = list(parallel_futures.items())
            for future, tool_name in futures:
                try:
                    output = future.result()
                    append_result(tool_name, output)
                    update_started_entry(tool_name, {
                        "status": "success",
                        "result": self._serialize_result(tool_name, output),
                        "model_used": getattr(output, "model_used", None),
                        "message": (
                            f"{tool_name} completed using "
                            f"{getattr(output, 'model_used', 'no-model')}"
                        ),
                        "completed_at": self._timestamp(),
                    })
                except Exception as exc:
                    update_started_entry(tool_name, {
                        "status": "failed",
                        "result": None,
                        "error": str(exc),
                        "error_type": type(exc).__name__,
                        "message": f"{tool_name} failed: {exc} - continuing pipeline",
                        "completed_at": self._timestamp(),
                    })

            parallel_executor.shutdown(wait=True)
            parallel_executor = None
            parallel_futures = {}

        steps = plan.get("steps", [])

        for step in steps:
            if should_stop():
                flush_parallel_tools()
                break

            tool_name = step.get("tool")
            is_forced = forced_tool_set is not None and tool_name in forced_tool_set
            checkpoint_entry = (
                self._find_checkpoint(tool_name, checkpoints)
                if use_checkpoints and not is_forced
                else None
            )

            if checkpoint_entry:
                checkpoint_result = self._deserialize_result(
                    tool_name,
                    checkpoint_entry["result"],
                )
                self._append_result(results, tool_name, checkpoint_result)
                append_log({
                    "tool": tool_name,
                    "status": "skipped",
                    "reason": "checkpoint_found",
                    "message": f"Skipping {tool_name} - checkpoint found",
                    "result": checkpoint_entry["result"],
                    "model_used": checkpoint_entry.get("model_used"),
                    "timestamp": self._timestamp(),
                })
            elif forced_tool_set is not None and not is_forced:
                append_log({
                    "tool": tool_name,
                    "status": "skipped",
                    "reason": "not_requested_for_rerun",
                    "message": f"Skipping {tool_name} - not requested by critic for this iteration",
                    "result": None,
                    "timestamp": self._timestamp(),
                })
            else:
                if tool_name in self.PARALLEL_WAVE_TOOLS:
                    if parallel_executor is None:
                        parallel_executor = concurrent.futures.ThreadPoolExecutor(
                            max_workers=self.MAX_PARALLEL_TOOLS
                        )

                    append_log({
                        "tool": tool_name,
                        "status": "started",
                        "message": f"Starting {tool_name}.",
                        "timestamp": self._timestamp(),
                    })
                    future = parallel_executor.submit(self._run_tool, idea, tool_name)
                    parallel_futures[future] = tool_name
                    continue

                flush_parallel_tools()
                if should_stop():
                    break
                append_log({
                    "tool": tool_name,
                    "status": "started",
                    "message": f"Starting {tool_name}.",
                    "timestamp": self._timestamp(),
                })
                try:
                    with state_lock:
                        swot_input = dict(results)
                    output = self._run_tool(idea, tool_name, swot_input)
                    append_result(tool_name, output)
                    update_started_entry(tool_name, {
                        "status": "success",
                        "result": self._serialize_result(tool_name, output),
                        "model_used": getattr(output, "model_used", None),
                        "message": (
                            f"{tool_name} completed using "
                            f"{getattr(output, 'model_used', 'no-model')}"
                        ),
                        "completed_at": self._timestamp(),
                    })
                except Exception as exc:
                    update_started_entry(tool_name, {
                        "status": "failed",
                        "result": None,
                        "error": str(exc),
                        "error_type": type(exc).__name__,
                        "message": f"{tool_name} failed: {exc} - continuing pipeline",
                        "completed_at": self._timestamp(),
                    })

        flush_parallel_tools()

        return {
            "results": results,
            "execution_log": execution_log,
            "aborted": should_stop(),
        }
