from django.urls import path

from .views import (
    AIChatView,
    EmailGeneratorView,
    LeadSummaryView,
    MeetingNotesView,
    LeadScoreView
)

urlpatterns = [

    path("email/",EmailGeneratorView.as_view()),

    path("lead-summary/",LeadSummaryView.as_view()),

    path("meeting-notes/",MeetingNotesView.as_view()),

    path("score/",LeadScoreView.as_view()),

    path("chat/",AIChatView.as_view()),
]