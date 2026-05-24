from django.urls import path
from .views import (
    analytics_summary,
    compare_analyses,
    compare_ideas,
    comparison_options,
    drift_dashboard,
    drift_dashboard_for_type,
    recalibrate_weights,
)

urlpatterns = [
    path("summary/", analytics_summary),
    path("drift/", drift_dashboard),
    path("drift/<str:idea_type>/", drift_dashboard_for_type),
    path("comparisons/options/", comparison_options),
    path("comparisons/analyses/", compare_analyses),
    path("comparisons/ideas/", compare_ideas),
    path("recalibrate/", recalibrate_weights),
]
