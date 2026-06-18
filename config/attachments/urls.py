from django.urls import path

from .views import (
    AttachmentUploadView,
    AttachmentListView,
    AttachmentDeleteView
)

urlpatterns = [

    path("upload/",AttachmentUploadView.as_view()),

    path("lead/<int:lead_id>/",AttachmentListView.as_view()),

    path("<int:attachment_id>/delete/",AttachmentDeleteView.as_view()),
]