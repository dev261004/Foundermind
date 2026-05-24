from django.urls import path
from .views import analytics_summary, recalibrate_weights

urlpatterns = [
    path("summary/", analytics_summary),
    path("recalibrate/", recalibrate_weights),
]
