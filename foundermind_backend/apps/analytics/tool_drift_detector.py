from apps.analytics.agent_metrics import AgentMetricsEngine


TOOL_DRIFT_THRESHOLD = 0.15  # 15% degradation
WINDOW_SIZE = 50


class ToolDriftDetector:

    @staticmethod
    def detect_tool_drift():

        recent = AgentMetricsEngine.tool_success_rate(WINDOW_SIZE)
        historical = AgentMetricsEngine.historical_tool_success_rate(WINDOW_SIZE)

        drift_results = {}

        for tool in sorted(set(recent) | set(historical)):

            recent_rate = recent.get(tool)
            historical_rate = historical.get(tool)

            if recent_rate is None or historical_rate is None:
                drift_results[tool] = {
                    "status": "insufficient_data",
                    "drift": 0,
                    "recent_success": recent_rate,
                    "historical_success": historical_rate,
                    "threshold": TOOL_DRIFT_THRESHOLD,
                    "window_size": WINDOW_SIZE,
                }
                continue

            drift = historical_rate - recent_rate

            if drift > TOOL_DRIFT_THRESHOLD:
                drift_results[tool] = {
                    "status": "drift_detected",
                    "drift": round(drift, 3),
                    "recent_success": recent_rate,
                    "historical_success": historical_rate,
                    "threshold": TOOL_DRIFT_THRESHOLD,
                    "window_size": WINDOW_SIZE,
                }
            else:
                drift_results[tool] = {
                    "status": "stable",
                    "drift": round(drift, 3),
                    "recent_success": recent_rate,
                    "historical_success": historical_rate,
                    "threshold": TOOL_DRIFT_THRESHOLD,
                    "window_size": WINDOW_SIZE,
                }

        return drift_results
