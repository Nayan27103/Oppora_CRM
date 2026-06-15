from django.urls import path

from .views import (
    ContactBulkCreateView,
    ContactCreateView,
    ContactListView,
    ContactUpdateView,
    ContactDeleteView
)

urlpatterns = [

    path("create/",ContactCreateView.as_view()),

    path("",ContactListView.as_view()),

    path("<int:pk>/",ContactUpdateView.as_view()),

    path("<int:pk>/delete/",ContactDeleteView.as_view()),

    path("bulk-create/",ContactBulkCreateView.as_view()),
]