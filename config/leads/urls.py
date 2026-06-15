from django.urls import path

from .views import (
    LeadBulkUpdateView,
    LeadCreateView,
    LeadListView,
    LeadUpdateView,
    LeadDeleteView,
    LeadStatsView
)

urlpatterns = [

    path("create/",LeadCreateView.as_view()),

    path("",LeadListView.as_view()),

    path("stats/",LeadStatsView.as_view(), name="lead-stats"),

    path("<int:pk>/",LeadUpdateView.as_view()),

    path("<int:pk>/delete/",LeadDeleteView.as_view()),
    
    path("bulk-update/",LeadBulkUpdateView.as_view()),

]