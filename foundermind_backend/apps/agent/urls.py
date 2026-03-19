from django.urls import path
from .views import get_analysis_status, run_analysis, start_analysis

urlpatterns = [
    path("start/", start_analysis),
    path("run/", run_analysis),
    path("status/<str:run_id>/", get_analysis_status),
]
