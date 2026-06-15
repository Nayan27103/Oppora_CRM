from django.urls import path

from .views import (
    AttachmentUploadView,
    AttachmentListView
)

urlpatterns = [

    path("upload/",AttachmentUploadView.as_view()),

    path("lead/<int:lead_id>/",AttachmentListView.as_view()),
]