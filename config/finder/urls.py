from django.urls import path
from .views import CompanySearchView, StartSearchView, SearchStatusView, SearchHistoryView, URLScanTestView, TheirStackTestView

urlpatterns = [
    path('search/', StartSearchView.as_view(), name='finder-search'),
    path('search/<int:pk>/status/', SearchStatusView.as_view(), name='finder-status'),
    path('history/', SearchHistoryView.as_view(), name='finder-history'),
    path('companies/', CompanySearchView.as_view(), name='finder-companies'),
    path('urlscan/', URLScanTestView.as_view(), name='finder-urlscan-test'),
    path('theirstack/', TheirStackTestView.as_view(), name='finder-theirstack-test'),
]