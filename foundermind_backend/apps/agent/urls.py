from django.urls import path
from .views import (
    get_analysis_status,
    run_analysis,
    start_analysis,
    stop_analysis,
    submit_clarification,
)

urlpatterns = [
    path("start/", start_analysis),
    path("run/", run_analysis),
    path("status/<str:run_id>/", get_analysis_status),
    path("stop/<str:run_id>/", stop_analysis),
    path("clarify/<str:run_id>/", submit_clarification),
]
