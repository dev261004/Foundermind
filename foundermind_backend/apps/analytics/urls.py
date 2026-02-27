from django.urls import path
from .views import analytics_summary

urlpatterns = [
    path("summary/", analytics_summary),
]