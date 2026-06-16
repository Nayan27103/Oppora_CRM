from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import status

from common.responses import success_response, error_response
from .models import SearchQuery
from .serializers import SearchQueryCreateSerializer, SearchQueryResultSerializer
from .tasks import run_finder_and_import
from .services import WebScraperService


class StartSearchView(APIView):
    """
    POST /api/finder/search/
    Accepts search criteria, creates a SearchQuery, fires Celery task.
    Returns immediately with query ID — client polls status endpoint.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SearchQueryCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(serializer.errors, status_code=400)

        query = serializer.save(user=request.user)

        # Fire async task
        run_finder_and_import.delay(query.id)

        return success_response(
            data={'query_id': query.id},
            message='Search started. Results will be imported automatically.',
            status_code=202
        )


class SearchStatusView(APIView):
    """
    GET /api/finder/search/<int:pk>/status/
    Poll this to check if the task is done and how many records were imported.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            query = SearchQuery.objects.get(id=pk, user=request.user)
        except SearchQuery.DoesNotExist:
            return error_response('Search not found.', status_code=404)

        serializer = SearchQueryResultSerializer(query)
        return success_response(data=serializer.data)


class SearchHistoryView(APIView):
    """
    GET /api/finder/history/
    Returns all past searches for the authenticated user.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queries = SearchQuery.objects.filter(user=request.user)[:20]
        serializer = SearchQueryResultSerializer(queries, many=True)
        return success_response(data=serializer.data)


class CompanySearchView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        industry = request.data.get('industry', '')
        location = request.data.get('location', '')
        keywords = request.data.get('keywords', '')

        scraper = WebScraperService()
        companies = scraper.search_companies_by_criteria(
            industry=industry,
            location=location,
            keywords=keywords,
        )
        return success_response(data=companies)