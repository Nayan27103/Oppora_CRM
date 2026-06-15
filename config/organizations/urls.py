from django.urls import path

from .views import *

urlpatterns = [

    path("create/",OrganizationCreateView.as_view()),

    path("",OrganizationListView.as_view()),

    path("members/add/",TeamMemberCreateView.as_view()),

    path("<int:organization_id>/members/",TeamMemberListView.as_view()),

    path("<int:pk>/update/",OrganizationUpdateView.as_view(), name="organization-update"),

    path("stats/",OrganizationStatsView.as_view()),
]