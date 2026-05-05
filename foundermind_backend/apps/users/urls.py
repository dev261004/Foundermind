from django.urls import path
from .views import forgot_password, login, register, reset_password

urlpatterns = [

    path("register/", register),
    path("login/", login),
    path("forgot-password/", forgot_password),
    path("reset-password/", reset_password),
]
