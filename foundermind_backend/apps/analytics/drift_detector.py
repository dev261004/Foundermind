from apps.analytics.agent_metrics import AgentMetricsEngine
from apps.analytics.weight_recalibrator import WeightRecalibrator
from apps.agent.models import AgentRun


DRIFT_THRESHOLD = 1.0
WINDOW_SIZE = 30


class DriftDetector:

    @staticmethod
    def detect_global_drift():

        recent_avg = AgentMetricsEngine.rolling_average_score(WINDOW_SIZE)
        baseline_avg = AgentMetricsEngine.historical_average_score(WINDOW_SIZE)

        if baseline_avg == 0 or recent_avg == 0:
            return {
                "status": "insufficient_data",
                "drift": 0,
                "recent_avg": recent_avg,
                "baseline_avg": baseline_avg,
                "threshold": DRIFT_THRESHOLD,
                "window_size": WINDOW_SIZE,
            }

        drift = baseline_avg - recent_avg

        if drift > DRIFT_THRESHOLD:
            status = "drift_detected"
        else:
            status = "stable"

        return {
            "status": status,
            "drift": round(drift, 2),
            "recent_avg": recent_avg,
            "baseline_avg": baseline_avg,
            "threshold": DRIFT_THRESHOLD,
            "window_size": WINDOW_SIZE,
        }

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

        if baseline_avg == 0 or recent_avg == 0:
            return {
                "status": "insufficient_data",
                "idea_type": idea_type,
                "drift": 0,
                "recent_avg": recent_avg,
                "baseline_avg": baseline_avg,
                "threshold": DRIFT_THRESHOLD,
                "window_size": WINDOW_SIZE,
            }

        drift = baseline_avg - recent_avg

        if drift > DRIFT_THRESHOLD:
            return {
                "status": "drift_detected",
                "idea_type": idea_type,
                "drift": round(drift, 2),
                "recent_avg": recent_avg,
                "baseline_avg": baseline_avg,
                "threshold": DRIFT_THRESHOLD,
                "window_size": WINDOW_SIZE,
            }

        return {
            "status": "stable",
            "idea_type": idea_type,
            "drift": round(drift, 2),
            "recent_avg": recent_avg,
            "baseline_avg": baseline_avg,
            "threshold": DRIFT_THRESHOLD,
            "window_size": WINDOW_SIZE,
        }

    @staticmethod
    def auto_recalibrate_all():

        global_drift = DriftDetector.detect_global_drift()
        per_type = DriftDetector.auto_recalibrate_per_type()

        return {
            "global_drift": global_drift,
            "drift_results": per_type["drift_results"],
            "recalibration_results": per_type["recalibration_results"],
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
