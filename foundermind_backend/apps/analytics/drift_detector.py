from apps.analytics.agent_metrics import AgentMetricsEngine
from apps.analytics.weight_recalibrator import WeightRecalibrator
from apps.agent.models import AgentRun


DRIFT_THRESHOLD = 1.0
WINDOW_SIZE = 30


class DriftDetector:

    @staticmethod
    def detect_drift_for_type(idea_type):

        recent_avg = AgentMetricsEngine.rolling_average_by_idea_type(
            idea_type,
            WINDOW_SIZE
        )

        baseline_avg = AgentMetricsEngine.historical_average_by_idea_type(
            idea_type,
            WINDOW_SIZE
        )

        if baseline_avg == 0:
            return {"status": "insufficient_data"}

        drift = baseline_avg - recent_avg

        if drift > DRIFT_THRESHOLD:
            return {
                "status": "drift_detected",
                "idea_type": idea_type,
                "drift": round(drift, 2),
                "recent_avg": recent_avg,
                "baseline_avg": baseline_avg
            }

        return {
            "status": "stable",
            "idea_type": idea_type,
            "drift": round(drift, 2)
        }

    @staticmethod
    def auto_recalibrate_per_type():

        idea_types = set(
            r.idea_type
            for r in AgentRun.objects(status="completed")
            if r.idea_type
        )

        drift_results = {}
        recalibration_results = {}

        for idea_type in idea_types:

            drift_info = DriftDetector.detect_drift_for_type(idea_type)
            drift_results[idea_type] = drift_info

            if drift_info["status"] == "drift_detected":
                recalibration_results[idea_type] = (
                    WeightRecalibrator.recalibrate_for_idea_type(idea_type)
                )

        return {
            "drift_results": drift_results,
            "recalibration_results": recalibration_results
        }