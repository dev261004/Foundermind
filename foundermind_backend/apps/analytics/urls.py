from django.urls import path
from .views import (
    analytics_summary,
    drift_dashboard,
    drift_dashboard_for_type,
    recalibrate_weights,
)

urlpatterns = [
    path("summary/", analytics_summary),
    path("drift/", drift_dashboard),
    path("drift/<str:idea_type>/", drift_dashboard_for_type),
    path("recalibrate/", recalibrate_weights),
]
