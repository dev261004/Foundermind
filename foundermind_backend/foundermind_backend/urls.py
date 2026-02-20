from django.urls import path, include

urlpatterns = [
    path("api/v1/agent/", include("apps.agent.urls")),
]