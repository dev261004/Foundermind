from django.urls import path
from .views import create_idea, get_ideas

urlpatterns = [
    path("create/", create_idea),
    path("", get_ideas),
]
