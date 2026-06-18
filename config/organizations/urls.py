from django.urls import path

from .views import *

urlpatterns = [

    path("create/",OrganizationCreateView.as_view()),

    path("",OrganizationListView.as_view()),

    path("members/add/",TeamMemberCreateView.as_view()),

    path("<int:organization_id>/members/",TeamMemberListView.as_view()),

    path("<int:pk>/update/",OrganizationUpdateView.as_view(), name="organization-update"),

    path("<int:pk>/delete/", OrganizationDeleteView.as_view(), name="organization-delete"),

    path("members/<int:pk>/update/", TeamMemberUpdateView.as_view(), name="member-update"),

    path("members/<int:pk>/delete/", TeamMemberDeleteView.as_view(), name="member-delete"),

    path("stats/",OrganizationStatsView.as_view()),
]