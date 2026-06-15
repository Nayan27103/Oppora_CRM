from django.urls import path

from .views import (
    NotificationListView,
    NotificationReadView,
    NotificationReadAllView,
    NotificationDeleteView
)

urlpatterns = [
    path("", NotificationListView.as_view()),
    path("<int:pk>/read/", NotificationReadView.as_view()),
    path("read-all/", NotificationReadAllView.as_view()),
    path("<int:pk>/delete/", NotificationDeleteView.as_view()),
]