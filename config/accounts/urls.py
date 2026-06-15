from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    MeView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("profile/", MeView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
]