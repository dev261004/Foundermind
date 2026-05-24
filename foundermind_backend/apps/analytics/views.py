from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.analytics.agent_metrics import AgentMetricsEngine
from apps.analytics.comparison_service import ComparisonService
from apps.analytics.services import DriftDashboardService
from apps.analytics.weight_recalibrator import WeightRecalibrator
from core.permissions import admin_required


@api_view(["GET"])
@admin_required
def analytics_summary(request):

    return Response({
        "average_overall_score": AgentMetricsEngine.average_overall_score(),
        "score_by_idea_type": AgentMetricsEngine.average_score_by_idea_type(),
        "tool_failure_rate": AgentMetricsEngine.tool_failure_rate(),
        "self_healing_ratio": AgentMetricsEngine.self_healing_ratio(),
        "confidence_calibration_error": AgentMetricsEngine.confidence_calibration_error(),
        "intelligence_index": AgentMetricsEngine.intelligence_index()
    })


@api_view(["GET"])
@admin_required
def drift_dashboard(request):

    idea_type = request.query_params.get("idea_type")
    return Response(DriftDashboardService.build_dashboard(idea_type=idea_type))


@api_view(["GET"])
@admin_required
def drift_dashboard_for_type(request, idea_type):

    return Response(DriftDashboardService.build_dashboard(idea_type=idea_type))


@api_view(["GET"])
@admin_required
def comparison_options(request):

    return Response(ComparisonService.get_options())


@api_view(["POST"])
@admin_required
def compare_analyses(request):

    run_ids = request.data.get("run_ids") or []
    return Response(ComparisonService.compare_analyses(run_ids))


@api_view(["POST"])
@admin_required
def compare_ideas(request):

    idea_ids = request.data.get("idea_ids") or []
    return Response(ComparisonService.compare_ideas(idea_ids))


@api_view(["POST"])
@admin_required
def recalibrate_weights(request):

    idea_type = request.data.get("idea_type")

    if not idea_type:
        return Response({"error": "idea_type required"}, status=400)

    result = WeightRecalibrator.recalibrate_for_idea_type(idea_type)

    return Response(result)
