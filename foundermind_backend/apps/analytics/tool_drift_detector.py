from apps.analytics.agent_metrics import AgentMetricsEngine


TOOL_DRIFT_THRESHOLD = 0.15  # 15% degradation
WINDOW_SIZE = 50


class ToolDriftDetector:

    @staticmethod
    def detect_tool_drift():

        recent = AgentMetricsEngine.tool_success_rate(WINDOW_SIZE)
        historical = AgentMetricsEngine.historical_tool_success_rate(WINDOW_SIZE)

        drift_results = {}

        for tool, recent_rate in recent.items():

            historical_rate = historical.get(tool)

            if historical_rate is None:
                continue

            drift = historical_rate - recent_rate

            if drift > TOOL_DRIFT_THRESHOLD:
                drift_results[tool] = {
                    "status": "drift_detected",
                    "drift": round(drift, 3),
                    "recent_success": recent_rate,
                    "historical_success": historical_rate
                }
            else:
                drift_results[tool] = {
                    "status": "stable",
                    "drift": round(drift, 3)
                }

        return drift_results