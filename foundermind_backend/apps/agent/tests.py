import time
import unittest
from unittest.mock import patch

from celery.exceptions import SoftTimeLimitExceeded

from apps.agent.executor import ToolExecutor
from apps.agent.orchestrator import StartupOrchestrator
from apps.agent import tasks


class FakeQuerySet:
    def __init__(self, result):
        self.result = result

    def first(self):
        return self.result


class FakeAgentRun:
    def __init__(self):
        self.id = "run-1"
        self.idea_id = "idea-1"
        self.execution_log = []
        self.models_used = {}
        self.status = "pending"
        self.critique = None
        self.original_description = ""

    def reload(self):
        return self

    def save(self):
        return None


class FakeIdea:
    def __init__(self, title="Idea", description="Test description for timeout handling."):
        self.title = title
        self.description = description


class ToolExecutorTests(unittest.TestCase):
    def setUp(self):
        self.executor = ToolExecutor()

    def test_parallel_wave_completes_faster_than_serial_baseline(self):
        plan = {
            "steps": [
                {"tool": "search_similar_startups"},
                {"tool": "search_market_data"},
                {"tool": "search_funding_info"},
            ]
        }

        def slow_result(label):
            def _inner(_idea):
                time.sleep(0.2)
                return label
            return _inner

        with (
            patch("apps.agent.executor.search_similar_startups", side_effect=slow_result("similar")),
            patch("apps.agent.executor.search_market_data", side_effect=slow_result("market")),
            patch("apps.agent.executor.search_funding_info", side_effect=slow_result("funding")),
        ):
            started = time.monotonic()
            execution_data = self.executor.execute_with_plan("idea", plan)
            elapsed = time.monotonic() - started

        self.assertLess(elapsed, 0.55)
        self.assertEqual(execution_data["results"]["similar_startups"], "similar")
        self.assertEqual(execution_data["results"]["market_data"], "market")
        self.assertEqual(execution_data["results"]["funding_info"], "funding")

    def test_swot_runs_after_parallel_wave_finishes(self):
        plan = {
            "steps": [
                {"tool": "search_similar_startups"},
                {"tool": "search_market_data"},
                {"tool": "search_funding_info"},
                {"tool": "generate_swot_analysis"},
            ]
        }
        completion_times = {}

        def complete_after(label):
            def _inner(_idea):
                time.sleep(0.15)
                completion_times[label] = time.monotonic()
                return label
            return _inner

        swot_started_at = {}

        def swot_result(*_args):
            swot_started_at["time"] = time.monotonic()
            return {"summary": "done"}

        with (
            patch("apps.agent.executor.search_similar_startups", side_effect=complete_after("similar")),
            patch("apps.agent.executor.search_market_data", side_effect=complete_after("market")),
            patch("apps.agent.executor.search_funding_info", side_effect=complete_after("funding")),
            patch("apps.agent.executor.generate_swot_analysis", side_effect=swot_result),
        ):
            execution_data = self.executor.execute_with_plan("idea", plan)

        self.assertIn("time", swot_started_at)
        self.assertGreaterEqual(swot_started_at["time"], max(completion_times.values()))
        self.assertEqual(execution_data["results"]["swot"], {"summary": "done"})

    def test_parallel_wave_failure_does_not_cancel_other_tools(self):
        plan = {
            "steps": [
                {"tool": "search_similar_startups"},
                {"tool": "search_market_data"},
                {"tool": "search_funding_info"},
            ]
        }

        def explode(_idea):
            time.sleep(0.05)
            raise ValueError("boom")

        with (
            patch("apps.agent.executor.search_similar_startups", side_effect=explode),
            patch("apps.agent.executor.search_market_data", return_value="market"),
            patch("apps.agent.executor.search_funding_info", return_value="funding"),
        ):
            execution_data = self.executor.execute_with_plan("idea", plan)

        self.assertNotIn("similar_startups", execution_data["results"])
        self.assertEqual(execution_data["results"]["market_data"], "market")
        self.assertEqual(execution_data["results"]["funding_info"], "funding")
        self.assertTrue(
            any(
                entry.get("tool") == "search_similar_startups" and entry.get("status") == "failed"
                for entry in execution_data["execution_log"]
            )
        )

    def test_successful_checkpoints_are_reused_for_non_forced_tools(self):
        plan = {"steps": [{"tool": "search_market_data"}]}
        checkpoints = [
            {
                "tool": "search_market_data",
                "status": "success",
                "result": "cached market",
            }
        ]

        with patch("apps.agent.executor.search_market_data") as search_market_data:
            execution_data = self.executor.execute_with_plan(
                "idea",
                plan,
                checkpoints=checkpoints,
                use_checkpoints=True,
            )

        search_market_data.assert_not_called()
        self.assertEqual(execution_data["results"]["market_data"], "cached market")
        self.assertEqual(execution_data["execution_log"][0]["reason"], "checkpoint_found")

    def test_forced_tools_bypass_existing_checkpoints(self):
        plan = {"steps": [{"tool": "search_market_data"}]}
        checkpoints = [
            {
                "tool": "search_market_data",
                "status": "success",
                "result": "cached market",
            }
        ]

        with patch("apps.agent.executor.search_market_data", return_value="fresh market") as search_market_data:
            execution_data = self.executor.execute_with_plan(
                "idea",
                plan,
                checkpoints=checkpoints,
                use_checkpoints=True,
                force_tools=["search_market_data"],
            )

        search_market_data.assert_called_once()
        self.assertEqual(execution_data["results"]["market_data"], "fresh market")
        self.assertFalse(
            any(entry.get("reason") == "checkpoint_found" for entry in execution_data["execution_log"])
        )


class StartupOrchestratorRerunTests(unittest.TestCase):
    def test_swot_is_added_when_upstream_dependency_reruns(self):
        critique = {
            "rerun_tools": ["search_market_data"],
            "section_scores": {},
        }

        rerun_tools = StartupOrchestrator().get_rerun_tools(critique)

        self.assertIn("search_market_data", rerun_tools)
        self.assertIn("generate_swot_analysis", rerun_tools)

    def test_swot_is_not_added_for_tech_stack_only_rerun(self):
        critique = {
            "rerun_tools": ["suggest_tech_stack"],
            "section_scores": {},
        }

        rerun_tools = StartupOrchestrator().get_rerun_tools(critique)

        self.assertIn("suggest_tech_stack", rerun_tools)
        self.assertNotIn("generate_swot_analysis", rerun_tools)


class StartupAnalysisTaskTests(unittest.TestCase):
    def test_task_timeout_limits_match_constants(self):
        self.assertEqual(
            tasks.run_startup_analysis.soft_time_limit,
            tasks.STARTUP_ANALYSIS_SOFT_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.run_startup_analysis.time_limit,
            tasks.STARTUP_ANALYSIS_HARD_TIMEOUT_SECONDS,
        )

    def test_timeout_message_uses_configured_soft_limit(self):
        fake_run = FakeAgentRun()
        fake_idea = FakeIdea()

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks.Idea.objects", return_value=FakeQuerySet(fake_idea)),
            patch("apps.agent.tasks.check_idea_quality", side_effect=SoftTimeLimitExceeded()),
        ):
            result = tasks.run_startup_analysis.run(str(fake_run.id))

        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["error"], "Analysis timed out after 10 minutes")
        self.assertEqual(fake_run.status, "failed")


if __name__ == "__main__":
    unittest.main()
