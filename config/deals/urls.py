from django.urls import path
from . import views


urlpatterns = [
    path('', views.DealListView.as_view(), name='deal-list'),
    path('create/', views.DealCreateView.as_view(), name='deal-create'),
    path('<int:pk>/update/', views.DealUpdateView.as_view(), name='deal-update'),
    path('<int:pk>/delete/', views.DealDeleteView.as_view(), name='deal-delete'),
    path("convert/",views.ConvertLeadToDealView.as_view()),
]   