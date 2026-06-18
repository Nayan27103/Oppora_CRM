from django.urls import path
from .views import WorkflowListView, WorkflowDetailView, WorkflowRunListView

urlpatterns = [
    path('', WorkflowListView.as_view(), name='workflow-list'),
    path('<uuid:pk>/', WorkflowDetailView.as_view(), name='workflow-detail'),
    path('runs/', WorkflowRunListView.as_view(), name='workflow-runs'),
]

