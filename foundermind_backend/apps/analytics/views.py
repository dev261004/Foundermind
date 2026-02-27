from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.analytics.agent_metrics import AgentMetricsEngine


@api_view(["GET"])
def analytics_summary(request):

    return Response({
        "average_overall_score": AgentMetricsEngine.average_overall_score(),
        "score_by_idea_type": AgentMetricsEngine.average_score_by_idea_type(),
        "tool_failure_rate": AgentMetricsEngine.tool_failure_rate(),
        "self_healing_ratio": AgentMetricsEngine.self_healing_ratio(),
        "confidence_calibration_error": AgentMetricsEngine.confidence_calibration_error(),
        "intelligence_index": AgentMetricsEngine.intelligence_index()
    })


from apps.analytics.weight_recalibrator import WeightRecalibrator


@api_view(["POST"])
def recalibrate_weights(request):

    idea_type = request.data.get("idea_type")

    if not idea_type:
        return Response({"error": "idea_type required"}, status=400)

    result = WeightRecalibrator.recalibrate_for_idea_type(idea_type)

    return Response(result)