from django.urls import path

from .views import (
    ActivityCreateView,
    ActivityListView,
    ActivityUpdateView,
    ActivityDeleteView,
    ActivityDeletedListView,
    ActivityRestoreView
)

urlpatterns = [

    path("create/",ActivityCreateView.as_view()),

    path("",ActivityListView.as_view()),

    path("deleted/",ActivityDeletedListView.as_view()),

    path("<int:pk>/",ActivityUpdateView.as_view()),

    path("<int:pk>/delete/",ActivityDeleteView.as_view()),

    path("<int:pk>/restore/",ActivityRestoreView.as_view()),
]