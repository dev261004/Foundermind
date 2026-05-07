import time
import unittest
from unittest.mock import patch

from celery.exceptions import SoftTimeLimitExceeded
from rest_framework.test import APIRequestFactory

from apps.agent import tasks
from apps.agent import views as agent_views
from apps.agent.executor import ToolExecutor
from apps.agent.orchestrator import StartupOrchestrator


class FakeQuerySet:
    def __init__(self, result):
        self.result = result

    def first(self):
        return self.result

    def order_by(self, *_args, **_kwargs):
        return self

    def only(self, *_args, **_kwargs):
        return self


class FakeAgentRun:
    def __init__(self, *, execution_log=None, pipeline_state=None, status="pending", section_states=None):
        self.id = "run-1"
        self.idea_id = "idea-1"
        self.execution_log = execution_log or []
        self.pipeline_state = pipeline_state or {}
        self.models_used = {}
        self.status = status
        self.section_states = section_states or {}
        self.critique = None
        self.report_summary = None
        self.idea_type = None
        self.classification_confidence = None
        self.analysis_confidence = None
        self.overall_score = None
        self.weighted_score = None
        self.iterations_used = None
        self.convergence_reason = None
        self.iteration_scores = []
        self.original_description = ""
        self.refined_description = ""
        self.quality_score = None
        self.quality_missing_signals = []
        self.clarification_questions = []
        self.clarification_answers = {}

    def reload(self):
        return self

    def save(self):
        return None


class FakeIdea:
    def __init__(self, title="Idea", description="Test description for staged analysis."):
        self.title = title
        self.description = description
        self.deleted = False

    def save(self):
        return None

    def delete(self):
        self.deleted = True


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

    def test_abort_callback_stops_scheduling_later_tools(self):
        plan = {
            "steps": [
                {"tool": "search_market_data"},
                {"tool": "generate_swot_analysis"},
            ]
        }
        abort_checks = {"count": 0}

        def should_abort():
            abort_checks["count"] += 1
            return abort_checks["count"] >= 2

        with (
            patch("apps.agent.executor.search_market_data", return_value="market"),
            patch("apps.agent.executor.generate_swot_analysis") as generate_swot_analysis,
        ):
            execution_data = self.executor.execute_with_plan(
                "idea",
                plan,
                should_abort=should_abort,
            )

        generate_swot_analysis.assert_not_called()
        self.assertEqual(execution_data["results"]["market_data"], "market")
        self.assertTrue(execution_data["aborted"])


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


class StartupAnalysisServiceTests(unittest.TestCase):
    def test_new_idea_cancelled_run_is_resumable(self):
        fake_run = FakeAgentRun(status="cancelled")
        fake_run.critique = {"cancelled_action": "new_idea"}

        self.assertTrue(tasks.StartupAnalysisService.is_resumable_run(fake_run))

    def test_edit_cancelled_run_is_resumable(self):
        fake_run = FakeAgentRun(status="cancelled")
        fake_run.critique = {"cancelled_action": "edit"}

        self.assertTrue(tasks.StartupAnalysisService.is_resumable_run(fake_run))


class StartupAnalysisTaskTests(unittest.TestCase):
    def test_dispatcher_queues_prepare_stage_in_async_mode(self):
        fake_run = FakeAgentRun(execution_log=[{"tool": "search_market_data", "status": "success"}])

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks._should_run_inline", return_value=False),
            patch("apps.agent.tasks.prepare_analysis_stage.delay") as prepare_delay,
        ):
            result = tasks.run_startup_analysis.run(str(fake_run.id))

        prepare_delay.assert_called_once_with(str(fake_run.id))
        self.assertEqual(result["status"], "running")
        self.assertEqual(fake_run.status, "running")
        self.assertEqual(fake_run.pipeline_state, {})

    def test_dispatcher_runs_inline_stage_helpers_in_direct_mode(self):
        fake_run = FakeAgentRun()

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks._should_run_inline", return_value=True),
            patch("apps.agent.tasks._run_prepare_stage", return_value={"status": "completed"}) as run_prepare_stage,
        ):
            result = tasks.run_startup_analysis.run(str(fake_run.id))

        run_prepare_stage.assert_called_once_with(str(fake_run.id), inline=True)
        self.assertEqual(result["status"], "completed")

    def test_prepare_stage_short_circuits_to_awaiting_clarification(self):
        fake_run = FakeAgentRun()
        fake_idea = FakeIdea()

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks.Idea.objects", return_value=FakeQuerySet(fake_idea)),
            patch(
                "apps.agent.tasks.check_idea_quality",
                return_value={
                    "total_score": 1,
                    "missing_signals": ["customer", "business model"],
                    "suggested_questions": ["Who is the customer?"],
                },
            ),
            patch("apps.agent.tasks.refine_description") as refine_description,
        ):
            result = tasks._run_prepare_stage(str(fake_run.id), inline=True)

        refine_description.assert_not_called()
        self.assertEqual(result["status"], "awaiting_clarification")
        self.assertEqual(fake_run.status, "awaiting_clarification")
        self.assertEqual(fake_run.clarification_questions, ["Who is the customer?"])
        self.assertEqual(fake_run.quality_missing_signals, ["customer", "business model"])

    def test_prepare_stage_persists_pipeline_state_and_queues_execute_stage(self):
        fake_run = FakeAgentRun()
        fake_idea = FakeIdea(title="Chaidesk", description="Short desc")
        plan = {"steps": [{"tool": "search_market_data"}]}
        classification = {
            "idea_type": "tech",
            "classification_confidence": 0.82,
            "classification_source": "llm",
            "weights": {"market_data": 1.0},
            "model_used": "critic-model",
        }

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks.Idea.objects", return_value=FakeQuerySet(fake_idea)),
            patch(
                "apps.agent.tasks.check_idea_quality",
                return_value={"total_score": 4, "missing_signals": []},
            ),
            patch("apps.agent.tasks.refine_description", return_value="Refined desc"),
            patch("apps.agent.tasks.StartupOrchestrator.classify_idea", return_value=classification),
            patch("apps.agent.tasks.PlannerAgent.create_plan", return_value=(plan, "planner-model")),
            patch("apps.agent.tasks._enqueue_stage", return_value={"status": "running"}) as enqueue_stage,
        ):
            result = tasks._run_prepare_stage(str(fake_run.id), inline=False)

        enqueue_stage.assert_called_once_with(
            tasks.execute_analysis_stage,
            str(fake_run.id),
            iteration=0,
            rerun_tools=None,
        )
        self.assertEqual(result["status"], "running")
        self.assertEqual(fake_run.pipeline_state["plan"], plan)
        self.assertEqual(fake_run.pipeline_state["classification"], classification)
        self.assertEqual(fake_run.pipeline_state["idea_text"], "Chaidesk\n\nRefined desc")

    def test_execute_stage_persists_results_and_queues_review_stage(self):
        fake_run = FakeAgentRun(
            pipeline_state={
                "idea_text": "Idea",
                "plan": {"steps": [{"tool": "search_market_data"}]},
                "classification": {},
            }
        )
        execution_data = {"results": {"market_data": "Market summary"}}
        enriched_results = {
            "market_data": "Market summary",
            "market_quantitative_model": {"score": 8},
        }

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks.ToolExecutor.execute_with_plan", return_value=execution_data),
            patch("apps.agent.tasks.StartupOrchestrator.enrich_results", return_value=enriched_results),
            patch("apps.agent.tasks._upsert_analysis_snapshot") as upsert_snapshot,
            patch("apps.agent.tasks._queue_or_run_review", return_value={"status": "running"}) as queue_review,
        ):
            result = tasks._run_execute_stage(str(fake_run.id), iteration=0, inline=False)

        upsert_snapshot.assert_called_once_with(fake_run, enriched_results)
        queue_review.assert_called_once_with(str(fake_run.id), iteration=0, inline=False)
        self.assertEqual(result["status"], "running")
        self.assertEqual(fake_run.section_states["market_data"]["status"], "success")
        self.assertIsNone(fake_run.section_states["market_data"]["cooldown_until"])

    def test_build_run_response_computes_retryable_section_states_for_existing_runs(self):
        fake_run = FakeAgentRun(
            execution_log=[
                {
                    "tool": "search_market_data",
                    "status": "success",
                    "result": "",
                },
                {
                    "tool": "search_funding_info",
                    "status": "failed",
                    "error": "API timeout",
                    "error_type": "TimeoutError",
                },
                {
                    "tool": "suggest_tech_stack",
                    "status": "skipped",
                    "reason": "not_requested_for_rerun",
                },
            ],
            pipeline_state={
                "plan": {
                    "steps": [
                        {"tool": "search_market_data"},
                        {"tool": "search_funding_info"},
                    ]
                }
            },
            status="partial",
        )

        with patch("apps.agent.services.Idea.objects", return_value=FakeQuerySet(None)):
            response = tasks.StartupAnalysisService.build_run_response(fake_run, analysis=object())

        market_state = response["section_states"]["market_data"]
        funding_state = response["section_states"]["funding_info"]

        self.assertEqual(market_state["status"], "data_unavailable")
        self.assertTrue(market_state["retryable"])
        self.assertIsNone(market_state["cooldown_until"])
        self.assertIsNone(market_state["last_retry_at"])

        self.assertEqual(funding_state["status"], "temporary_api_error")
        self.assertTrue(funding_state["retryable"])
        self.assertIsNone(funding_state["cooldown_until"])
        self.assertNotIn("tech_stack", response["section_states"])

    def test_section_retry_uses_refine_message_after_third_data_unavailable_retry(self):
        fake_run = FakeAgentRun(
            execution_log=[
                {
                    "type": "section_retry",
                    "section_key": "market_data",
                    "outcome_status": "data_unavailable",
                },
                {
                    "type": "section_retry",
                    "section_key": "market_data",
                    "outcome_status": "data_unavailable",
                },
            ],
            pipeline_state={
                "idea_text": "Idea",
                "plan": {"steps": [{"tool": "search_market_data"}]},
            },
            status="partial",
        )
        execution_data = {"results": {"market_data": ""}}

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks.ToolExecutor.execute_with_plan", return_value=execution_data),
            patch("apps.agent.tasks.StartupOrchestrator.review_results", return_value=({}, None)),
            patch("apps.agent.tasks._update_execution_entry"),
        ):
            result = tasks._run_section_retry(str(fake_run.id), "market_data")

        self.assertEqual(result["section_state"]["status"], "data_unavailable")
        self.assertEqual(
            result["section_state"]["message"],
            "Data may genuinely be unavailable for this idea. "
            "Try refining the description for better results.",
        )
        self.assertEqual(
            fake_run.section_states["market_data"]["message"],
            "Data may genuinely be unavailable for this idea. "
            "Try refining the description for better results.",
        )

    def test_review_stage_queues_next_execute_iteration_when_rerun_is_needed(self):
        fake_run = FakeAgentRun(
            pipeline_state={
                "idea_text": "Idea",
                "plan": {"steps": [{"tool": "search_market_data"}]},
                "classification": {
                    "idea_type": "general",
                    "classification_confidence": 0.7,
                    "weights": {"market_data": 1.0},
                },
            }
        )
        critique = {
            "overall_score": 5,
            "section_scores": {"market_data": 5},
            "issues_found": ["Need more market depth"],
            "rerun_tools": [],
            "needs_rerun": True,
        }

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks._restore_enriched_results", return_value={"market_data": "Market"}),
            patch("apps.agent.tasks.StartupOrchestrator.review_results", return_value=(critique, "critic-model")),
            patch("apps.agent.tasks._queue_or_run_execute", return_value={"status": "running"}) as queue_execute,
        ):
            result = tasks._run_review_stage(str(fake_run.id), iteration=0, inline=False)

        queue_execute.assert_called_once_with(
            str(fake_run.id),
            iteration=1,
            rerun_tools=["search_market_data", "generate_swot_analysis"],
            inline=False,
        )
        self.assertEqual(result["status"], "running")
        self.assertEqual(fake_run.iteration_scores, [5.0])
        self.assertEqual(fake_run.iterations_used, 0)
        self.assertTrue(
            any(entry.get("type") == "self_healing_cycle" for entry in fake_run.execution_log)
        )

    def test_review_stage_queues_report_stage_when_converged(self):
        fake_run = FakeAgentRun(
            pipeline_state={
                "idea_text": "Idea",
                "plan": {"steps": [{"tool": "search_market_data"}]},
                "classification": {
                    "idea_type": "general",
                    "classification_confidence": 0.7,
                    "weights": {"market_data": 1.0},
                },
            }
        )
        critique = {
            "overall_score": 8,
            "section_scores": {"market_data": 8},
            "issues_found": [],
            "rerun_tools": [],
            "needs_rerun": False,
        }

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks._restore_enriched_results", return_value={"market_data": "Market"}),
            patch("apps.agent.tasks.StartupOrchestrator.review_results", return_value=(critique, "critic-model")),
            patch("apps.agent.tasks._queue_or_run_report", return_value={"status": "running"}) as queue_report,
        ):
            result = tasks._run_review_stage(str(fake_run.id), iteration=0, inline=False)

        queue_report.assert_called_once_with(str(fake_run.id), inline=False)
        self.assertEqual(result["status"], "running")
        self.assertEqual(fake_run.convergence_reason, "All sections above threshold")
        self.assertTrue(
            any(entry.get("type") == "convergence" for entry in fake_run.execution_log)
        )

    def test_report_stage_finalizes_completed_run_and_persists_action_plan(self):
        fake_run = FakeAgentRun(
            execution_log=[
                {
                    "tool": "search_market_data",
                    "status": "success",
                    "result": "Market summary",
                }
            ],
            pipeline_state={
                "idea_text": "Idea",
                "classification": {
                    "idea_type": "general",
                    "classification_confidence": 0.7,
                },
            },
        )
        reporter_result = {
            "action_plan": {"horizon": "Act now", "actions": []},
            "model_used": "reporter-model",
        }

        with (
            patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.tasks._restore_enriched_results", return_value={"market_data": "Market"}),
            patch("apps.agent.tasks.ReporterAgent.generate_report", return_value=reporter_result),
            patch("apps.agent.tasks._upsert_analysis_snapshot") as upsert_snapshot,
        ):
            result = tasks._run_report_stage(str(fake_run.id))

        upsert_snapshot.assert_called_once_with(
            fake_run,
            {"market_data": "Market"},
            report_summary="Act now",
            action_plan={"horizon": "Act now", "actions": []},
        )
        self.assertEqual(result["status"], "completed")
        self.assertEqual(fake_run.status, "completed")
        self.assertEqual(fake_run.report_summary, "Act now")
        self.assertEqual(fake_run.models_used["reporter"], "reporter-model")

    def test_stage_timeout_limits_match_constants(self):
        self.assertEqual(
            tasks.prepare_analysis_stage.soft_time_limit,
            tasks.PREPARE_ANALYSIS_SOFT_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.prepare_analysis_stage.time_limit,
            tasks.PREPARE_ANALYSIS_HARD_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.execute_analysis_stage.soft_time_limit,
            tasks.EXECUTE_ANALYSIS_SOFT_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.execute_analysis_stage.time_limit,
            tasks.EXECUTE_ANALYSIS_HARD_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.review_analysis_stage.soft_time_limit,
            tasks.REVIEW_ANALYSIS_SOFT_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.review_analysis_stage.time_limit,
            tasks.REVIEW_ANALYSIS_HARD_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.report_analysis_stage.soft_time_limit,
            tasks.REPORT_ANALYSIS_SOFT_TIMEOUT_SECONDS,
        )
        self.assertEqual(
            tasks.report_analysis_stage.time_limit,
            tasks.REPORT_ANALYSIS_HARD_TIMEOUT_SECONDS,
        )

    def test_stage_timeout_messages_mark_run_failed(self):
        fake_run = FakeAgentRun()
        timeout_cases = [
            (
                tasks.prepare_analysis_stage,
                "apps.agent.tasks._run_prepare_stage",
                "Prepare analysis stage timed out after 4 minutes",
            ),
            (
                tasks.execute_analysis_stage,
                "apps.agent.tasks._run_execute_stage",
                "Execute analysis stage timed out after 7 minutes",
            ),
            (
                tasks.review_analysis_stage,
                "apps.agent.tasks._run_review_stage",
                "Review analysis stage timed out after 4 minutes",
            ),
            (
                tasks.report_analysis_stage,
                "apps.agent.tasks._run_report_stage",
                "Report analysis stage timed out after 4 minutes",
            ),
        ]

        for task_obj, helper_path, expected_error in timeout_cases:
            with self.subTest(task=task_obj.name):
                fake_run.execution_log = []
                fake_run.status = "running"
                fake_run.critique = None
                with (
                    patch("apps.agent.tasks.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
                    patch(helper_path, side_effect=SoftTimeLimitExceeded()),
                ):
                    result = task_obj.run(str(fake_run.id))

                self.assertEqual(result["status"], "failed")
                self.assertEqual(result["error"], expected_error)
                self.assertEqual(fake_run.status, "failed")
                self.assertEqual(fake_run.critique["error"], expected_error)


class AgentAnalysisViewTests(unittest.TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_stop_analysis_marks_run_cancelled_for_edit(self):
        fake_run = FakeAgentRun(status="running")
        fake_idea = FakeIdea(title="Chaidesk", description="Desk ops platform")

        request = self.factory.post(
            "/agent/stop/run-1/",
            {"action": "edit"},
            format="json",
        )

        with (
            patch("apps.agent.views.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.views.Idea.objects", return_value=FakeQuerySet(fake_idea)),
        ):
            response = agent_views.stop_analysis(request, str(fake_run.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "cancelled")
        self.assertEqual(response.data["idea_id"], fake_run.idea_id)
        self.assertEqual(response.data["title"], "Chaidesk")
        self.assertEqual(fake_run.status, "cancelled")
        self.assertEqual(fake_run.execution_log[-1]["type"], "user_cancelled")
        self.assertEqual(fake_run.execution_log[-1]["action"], "edit")

    def test_stop_analysis_terminate_deletes_idea_artifacts(self):
        fake_run = FakeAgentRun(status="running")
        fake_idea = FakeIdea(title="Chaidesk", description="Desk ops platform")

        request = self.factory.post(
            "/agent/stop/run-1/",
            {"action": "terminate"},
            format="json",
        )

        with (
            patch("apps.agent.views.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.views.Idea.objects", return_value=FakeQuerySet(fake_idea)),
            patch("apps.agent.views.StartupAnalysisService.delete_analysis_artifacts_for_idea") as delete_artifacts,
        ):
            response = agent_views.stop_analysis(request, str(fake_run.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "terminated")
        self.assertEqual(fake_run.status, "cancelled")
        self.assertTrue(fake_idea.deleted)
        delete_artifacts.assert_called_once_with(fake_run.idea_id)

    def test_start_analysis_returns_cached_cancelled_run(self):
        fake_run = FakeAgentRun(status="cancelled")
        fake_run.execution_log = [{"type": "user_cancelled", "action": "new_idea"}]
        fake_run.critique = {"message": "Analysis stopped by user."}

        request = self.factory.post(
            "/agent/start/",
            {"idea_id": "idea-1"},
            format="json",
        )

        with (
            patch("apps.agent.views.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.views.IdeaAnalysis.objects", return_value=FakeQuerySet(None)),
        ):
            response = agent_views.start_analysis(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "cancelled")
        self.assertEqual(response.data["mode"], "cached")
        self.assertEqual(response.data["execution_log"], fake_run.execution_log)

    def test_force_start_resumes_same_cancelled_run_from_saved_progress(self):
        fake_run = FakeAgentRun(status="cancelled")
        fake_run.pipeline_state = {
            "idea_text": "Idea",
            "plan": {"steps": [{"tool": "search_market_data"}]},
        }
        fake_run.execution_log = [
            {
                "tool": "search_market_data",
                "status": "success",
                "result": "cached market",
                "iteration": 0,
            },
            {"type": "user_cancelled", "action": "edit"},
        ]
        fake_run.critique = {"cancelled_action": "edit"}

        request = self.factory.post(
            "/agent/start/",
            {"idea_id": "idea-1", "force": True},
            format="json",
        )

        with (
            patch("apps.agent.views.AgentRun.objects", return_value=FakeQuerySet(fake_run)),
            patch("apps.agent.views.execute_analysis_stage.delay") as execute_delay,
        ):
            response = agent_views.start_analysis(request)

        execute_delay.assert_called_once_with(
            str(fake_run.id),
            iteration=0,
            rerun_tools=None,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["agent_run_id"], str(fake_run.id))
        self.assertEqual(response.data["status"], "running")
        self.assertEqual(response.data["execution_log"], fake_run.execution_log)
        self.assertEqual(fake_run.status, "running")


if __name__ == "__main__":
    unittest.main()
