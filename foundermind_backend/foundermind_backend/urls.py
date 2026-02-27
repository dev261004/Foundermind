from django.urls import path, include

urlpatterns = [
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/ideas/", include("apps.ideas.urls")),
    path("api/v1/agent/", include("apps.agent.urls")),
    path("api/v1/agent_analysis/",include("apps.analytics.urls"))
]
