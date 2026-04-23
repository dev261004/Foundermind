from django.urls import path
from .views import create_idea, get_idea_history, get_ideas

urlpatterns = [
    path("history/", get_idea_history),
    path("create/", create_idea),
    path("", get_ideas),
]
