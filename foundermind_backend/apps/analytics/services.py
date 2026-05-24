import datetime
from collections import defaultdict
from statistics import mean

from bson import ObjectId

from apps.agent.models import AgentRun, IdeaAnalysis
from apps.agent.orchestrator import BASE_IDEA_TYPES
from apps.analytics.agent_metrics import AgentMetricsEngine
from apps.analytics.competitor_matrix import CompetitorMatrix
from apps.analytics.drift_detector import DriftDetector
from apps.analytics.tool_drift_detector import ToolDriftDetector
from apps.analytics.weight_recalibrator import TARGET_SCORE, WeightRecalibrator


COMPLETED_STATUSES = AgentMetricsEngine.COMPLETED_STATUSES
DEFAULT_IDEA_TYPES = tuple(BASE_IDEA_TYPES.keys())
TREND_DAYS = 90
RECENT_MARKET_WINDOW = 20


def _serialize_datetime(value):
    return value.isoformat() if value else None


def _to_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _mean(values):
    cleaned = [value for value in values if value is not None]
    return round(mean(cleaned), 3) if cleaned else None


def _titleize(value):
    return value.replace("_", " ").title()


class DriftDashboardService:
    @staticmethod
    def build_dashboard(idea_type=None):
        monitored_types = DriftDashboardService._monitored_idea_types(idea_type)
        model_drift = DriftDetector.detect_global_drift()
        idea_type_drift = [
            DriftDashboardService._enrich_idea_type_drift(
                DriftDetector.detect_drift_for_type(current_type)
            )
            for current_type in monitored_types
        ]
        tool_drift = DriftDashboardService._build_tool_drift()
        market_landscape = DriftDashboardService._build_market_landscape(
            monitored_types
        )
        competitors = CompetitorMatrix.top_competitors(idea_type=idea_type)
        weight_alerts = DriftDashboardService._build_weight_alerts(monitored_types)
        recalibration_triggers = DriftDashboardService._build_recalibration_triggers(
            idea_type_drift,
            weight_alerts,
        )
        historical_trends = DriftDashboardService._build_historical_trends()
        recommendations = DriftDashboardService._build_recommendations(
            model_drift,
            idea_type_drift,
            tool_drift,
            market_landscape,
            weight_alerts,
            recalibration_triggers,
        )
        active_alerts = DriftDashboardService._count_active_alerts(
            model_drift,
            idea_type_drift,
            tool_drift,
            market_landscape,
            weight_alerts,
            recalibration_triggers,
        )

        return {
            "generated_at": _serialize_datetime(datetime.datetime.utcnow()),
            "summary": {
                "overall_status": DriftDashboardService._overall_status(
                    active_alerts,
                    model_drift,
                    idea_type_drift,
                    tool_drift,
                ),
                "total_completed_runs": AgentRun.objects(
                    status__in=COMPLETED_STATUSES
                ).count(),
                "idea_types_monitored": len(monitored_types),
                "active_alerts": active_alerts,
                "recommendation_count": len(recommendations),
            },
            "model_drift": model_drift,
            "idea_type_drift": idea_type_drift,
            "tool_drift": tool_drift,
            "market_landscape": market_landscape,
            "competitors": competitors,
            "weight_alerts": weight_alerts,
            "recalibration_triggers": recalibration_triggers,
            "historical_trends": historical_trends,
            "recommendations": recommendations,
        }

    @staticmethod
    def _monitored_idea_types(idea_type=None):
        if idea_type:
            return [idea_type]

        discovered = {
            run.idea_type
            for run in AgentRun.objects(
                status__in=COMPLETED_STATUSES,
                idea_type__ne=None,
            ).only("idea_type")
            if run.idea_type
        }
        return sorted(set(DEFAULT_IDEA_TYPES) | discovered)

    @staticmethod
    def _enrich_idea_type_drift(drift_info):
        idea_type = drift_info.get("idea_type")
        sample_size = AgentRun.objects(
            status__in=COMPLETED_STATUSES,
            idea_type=idea_type,
        ).count()
        return {
            "idea_type": idea_type,
            "status": drift_info.get("status", "insufficient_data"),
            "drift": drift_info.get("drift", 0),
            "recent_avg": drift_info.get("recent_avg", 0),
            "baseline_avg": drift_info.get("baseline_avg", 0),
            "threshold": drift_info.get("threshold", 1.0),
            "window_size": drift_info.get("window_size", 30),
            "sample_size": sample_size,
        }

    @staticmethod
    def _build_tool_drift():
        results = ToolDriftDetector.detect_tool_drift()
        return [
            {
                "tool_name": tool_name,
                "status": details.get("status", "insufficient_data"),
                "drift": details.get("drift", 0),
                "recent_success": details.get("recent_success"),
                "historical_success": details.get("historical_success"),
                "threshold": details.get("threshold", 0.15),
                "window_size": details.get("window_size", 50),
            }
            for tool_name, details in sorted(results.items())
        ]

    @staticmethod
    def _build_market_landscape(idea_types):
        grouped = DriftDashboardService._collect_market_models(idea_types)
        rows = []

        for idea_type in idea_types:
            models = grouped.get(idea_type, [])
            recent = models[:RECENT_MARKET_WINDOW]
            historical = models[RECENT_MARKET_WINDOW:]

            current_tam = _mean([item["tam"] for item in recent])
            previous_tam = _mean([item["tam"] for item in historical])
            current_cagr = _mean([item["cagr"] for item in recent])
            previous_cagr = _mean([item["cagr"] for item in historical])
            opportunity_score = _mean([item["opportunity_score"] for item in recent])

            tam_delta_percent = None
            if current_tam is not None and previous_tam:
                tam_delta_percent = round((current_tam - previous_tam) / previous_tam, 3)

            cagr_delta = None
            if current_cagr is not None and previous_cagr is not None:
                cagr_delta = round(current_cagr - previous_cagr, 4)

            status, trend = DriftDashboardService._market_status(
                current_tam,
                previous_tam,
                current_cagr,
                previous_cagr,
                opportunity_score,
            )

            rows.append({
                "idea_type": idea_type,
                "status": status,
                "trend": trend,
                "current_tam_billion_usd": current_tam,
                "previous_tam_billion_usd": previous_tam,
                "tam_delta_percent": tam_delta_percent,
                "current_cagr": current_cagr,
                "previous_cagr": previous_cagr,
                "cagr_delta": cagr_delta,
                "opportunity_score": opportunity_score,
                "sample_size": len(models),
            })

        return rows

    @staticmethod
    def _collect_market_models(idea_types):
        grouped = defaultdict(list)
        analyses = (
            IdeaAnalysis.objects()
            .only("idea_id", "run_id", "market_quantitative_model", "created_at")
            .order_by("-created_at")
            .limit(400)
        )

        run_cache = {}
        latest_run_by_idea = {}

        for analysis in analyses:
            model = analysis.market_quantitative_model or {}
            if not model or model.get("error"):
                continue

            run = None
            if analysis.run_id:
                if analysis.run_id not in run_cache:
                    run_cache[analysis.run_id] = None
                    if ObjectId.is_valid(str(analysis.run_id)):
                        run_cache[analysis.run_id] = AgentRun.objects(
                            id=ObjectId(str(analysis.run_id))
                        ).only("idea_type", "created_at").first()
                run = run_cache[analysis.run_id]

            if not run and analysis.idea_id:
                if analysis.idea_id not in latest_run_by_idea:
                    latest_run_by_idea[analysis.idea_id] = (
                        AgentRun.objects(idea_id=analysis.idea_id)
                        .only("idea_type", "created_at")
                        .order_by("-created_at")
                        .first()
                    )
                run = latest_run_by_idea[analysis.idea_id]

            analysis_idea_type = getattr(run, "idea_type", None) or "general"
            if analysis_idea_type not in idea_types:
                continue

            grouped[analysis_idea_type].append({
                "tam": _to_float(model.get("tam_billion_usd")),
                "cagr": _to_float(model.get("calculated_cagr")),
                "opportunity_score": _to_float(model.get("opportunity_score")),
                "created_at": getattr(analysis, "created_at", None),
            })

        return grouped

    @staticmethod
    def _market_status(current_tam, previous_tam, current_cagr, previous_cagr, opportunity):
        if current_tam is None and current_cagr is None and opportunity is None:
            return "insufficient_data", "insufficient_data"

        if previous_tam is None and previous_cagr is None:
            return "insufficient_data", "watching"

        tam_delta = 0
        if current_tam is not None and previous_tam:
            tam_delta = (current_tam - previous_tam) / previous_tam

        cagr_delta = 0
        if current_cagr is not None and previous_cagr is not None:
            cagr_delta = current_cagr - previous_cagr

        if tam_delta <= -0.15 or cagr_delta <= -0.03:
            return "changed", "contracting"
        if tam_delta >= 0.15 or cagr_delta >= 0.03:
            return "changed", "expanding"
        return "stable", "steady"

    @staticmethod
    def _build_weight_alerts(idea_types):
        alerts = []
        for idea_type in idea_types:
            preview = WeightRecalibrator.preview_recalibration_for_idea_type(idea_type)

            if preview["status"] != "ready":
                alerts.append({
                    "idea_type": idea_type,
                    "status": preview["status"],
                    "current_weights": {},
                    "suggested_weights": {},
                    "changes": [],
                    "section_averages": {},
                    "reason": "Not enough scored section history for recalibration.",
                })
                continue

            changes = []
            for section, delta in preview["changes"].items():
                changes.append({
                    "section": section,
                    "current_weight": preview["current_weights"].get(section, 0),
                    "suggested_weight": preview["suggested_weights"].get(section, 0),
                    "delta": delta,
                })

            significant_changes = [
                change for change in changes if abs(change["delta"]) >= 0.02
            ]
            weak_sections = [
                section
                for section, score in preview["section_averages"].items()
                if score < TARGET_SCORE
            ]
            cleaned_sections = preview.get("cleaned_sections", [])

            alerts.append({
                "idea_type": idea_type,
                "status": (
                    "adjustment_recommended"
                    if significant_changes or cleaned_sections
                    else "stable"
                ),
                "current_weights": preview["current_weights"],
                "suggested_weights": preview["suggested_weights"],
                "changes": changes,
                "section_averages": preview["section_averages"],
                "reason": DriftDashboardService._weight_alert_reason(
                    weak_sections,
                    cleaned_sections,
                ),
            })

        return alerts

    @staticmethod
    def _weight_alert_reason(weak_sections, cleaned_sections=None):
        if cleaned_sections:
            labels = ", ".join(_titleize(section) for section in cleaned_sections[:3])
            return f"Saved weights include non-scoring sections to remove: {labels}."
        if not weak_sections:
            return "Section scores are close to target."
        labels = ", ".join(_titleize(section) for section in weak_sections[:3])
        return f"{labels} below target score."

    @staticmethod
    def _build_recalibration_triggers(idea_type_drift, weight_alerts):
        weight_alert_by_type = {
            alert["idea_type"]: alert
            for alert in weight_alerts
        }
        triggers = []

        for drift in idea_type_drift:
            idea_type = drift["idea_type"]
            weight_alert = weight_alert_by_type.get(idea_type, {})
            section_averages = weight_alert.get("section_averages", {})
            weak_sections = {
                section: score
                for section, score in section_averages.items()
                if score < TARGET_SCORE
            }
            reasons = []

            if drift["status"] == "drift_detected":
                reasons.append("Recent model score is below historical baseline.")
            if weight_alert.get("status") == "adjustment_recommended":
                reasons.append("Suggested scoring weights differ from current weights.")
            if weak_sections and not reasons:
                reasons.append(
                    "Weak sections exist, but weights may not change if all weighted sections are similarly weak."
                )

            triggers.append({
                "idea_type": idea_type,
                "should_recalibrate": (
                    drift["status"] == "drift_detected"
                    or weight_alert.get("status") == "adjustment_recommended"
                ),
                "reasons": reasons,
                "drift_score": drift.get("drift", 0),
                "weak_sections": weak_sections,
            })

        return triggers

    @staticmethod
    def _build_historical_trends():
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=TREND_DAYS)
        runs = AgentRun.objects(
            status__in=COMPLETED_STATUSES,
            created_at__gte=cutoff,
        ).only(
            "created_at",
            "overall_score",
            "weighted_score",
            "analysis_confidence",
        )

        grouped = defaultdict(lambda: {
            "overall_scores": [],
            "weighted_scores": [],
            "confidences": [],
        })

        for run in runs:
            date_key = run.created_at.date().isoformat()
            if run.overall_score is not None:
                grouped[date_key]["overall_scores"].append(run.overall_score)
            if run.weighted_score is not None:
                grouped[date_key]["weighted_scores"].append(run.weighted_score)
            if run.analysis_confidence is not None:
                grouped[date_key]["confidences"].append(run.analysis_confidence)

        trends = []
        previous_average = None
        for date_key in sorted(grouped):
            values = grouped[date_key]
            average_score = _mean(values["overall_scores"])
            weighted_score = _mean(values["weighted_scores"])
            confidence = _mean(values["confidences"])
            drift_score = 0
            if average_score is not None and previous_average is not None:
                drift_score = round(previous_average - average_score, 3)
            if average_score is not None:
                previous_average = average_score

            trends.append({
                "date": date_key,
                "average_score": average_score,
                "weighted_score": weighted_score,
                "analysis_confidence": confidence,
                "run_count": len(values["overall_scores"]),
                "drift_score": drift_score,
            })

        return trends

    @staticmethod
    def _build_recommendations(
        model_drift,
        idea_type_drift,
        tool_drift,
        market_landscape,
        weight_alerts,
        recalibration_triggers,
    ):
        recommendations = []

        if model_drift.get("status") == "drift_detected":
            recommendations.append({
                "priority": "high",
                "area": "model",
                "title": "Review global scoring drift",
                "description": "Recent overall score is below the historical baseline.",
                "action": "Audit low-scoring recent runs and recalibrate affected idea types.",
            })

        for drift in idea_type_drift:
            if drift["status"] == "drift_detected":
                recommendations.append({
                    "priority": "high",
                    "area": "model",
                    "idea_type": drift["idea_type"],
                    "title": f"Recalibrate {_titleize(drift['idea_type'])}",
                    "description": "Recent quality has fallen below the baseline for this idea type.",
                    "action": "Run weight recalibration and inspect weak sections.",
                })

        for tool in tool_drift:
            if tool["status"] == "drift_detected":
                recommendations.append({
                    "priority": "high",
                    "area": "tool",
                    "title": f"Inspect {_titleize(tool['tool_name'])}",
                    "description": "Recent tool success rate degraded against historical performance.",
                    "action": "Check provider errors, parsing failures, and retry outcomes.",
                })

        for market in market_landscape:
            if market["trend"] == "contracting":
                recommendations.append({
                    "priority": "medium",
                    "area": "market",
                    "idea_type": market["idea_type"],
                    "title": f"Refresh {_titleize(market['idea_type'])} market assumptions",
                    "description": "Market size or CAGR signals are lower than the prior baseline.",
                    "action": "Prioritize fresh market-data runs and compare funding signals.",
                })

        for trigger in recalibration_triggers:
            if trigger["should_recalibrate"]:
                recommendations.append({
                    "priority": "medium",
                    "area": "weights",
                    "idea_type": trigger["idea_type"],
                    "title": f"Apply {_titleize(trigger['idea_type'])} weight review",
                    "description": "Drift or section-quality signals indicate a scoring weight update.",
                    "action": "Use the recalibration action from the drift dashboard.",
                })

        if not recommendations:
            recommendations.append({
                "priority": "low",
                "area": "monitoring",
                "title": "No urgent drift action",
                "description": "Current model, tool, and market signals are within thresholds.",
                "action": "Continue monitoring scheduled drift checks.",
            })

        return recommendations[:8]

    @staticmethod
    def _count_active_alerts(
        model_drift,
        idea_type_drift,
        tool_drift,
        market_landscape,
        weight_alerts,
        recalibration_triggers,
    ):
        count = 0
        if model_drift.get("status") == "drift_detected":
            count += 1
        count += sum(1 for item in idea_type_drift if item["status"] == "drift_detected")
        count += sum(1 for item in tool_drift if item["status"] == "drift_detected")
        count += sum(1 for item in market_landscape if item["trend"] == "contracting")
        count += sum(
            1 for item in weight_alerts
            if item["status"] == "adjustment_recommended"
        )
        count += sum(
            1 for item in recalibration_triggers
            if item["should_recalibrate"]
        )
        return count

    @staticmethod
    def _overall_status(active_alerts, model_drift, idea_type_drift, tool_drift):
        if (
            model_drift.get("status") == "insufficient_data"
            and not idea_type_drift
            and not tool_drift
        ):
            return "insufficient_data"
        if active_alerts >= 4:
            return "critical"
        if active_alerts > 0:
            return "attention"
        return "stable"
