import requests
from decouple import config
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
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

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
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        try:
            query = SearchQuery.objects.get(id=pk, user=request.user)
        except SearchQuery.DoesNotExist:
            return error_response('Search not found.', status_code=404)

        serializer = SearchQueryResultSerializer(query)
        data = serializer.data
        
        # Inject API key config status warnings
        from decouple import config
        data['serper_configured'] = bool(config('SERPER_API_KEY', default=''))
        data['hunter_configured'] = bool(config('HUNTER_API_KEY', default=''))
        
        return success_response(data=data)


class SearchHistoryView(APIView):
    """
    GET /api/finder/history/
    Returns all past searches for the authenticated user.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        queries = SearchQuery.objects.filter(user=request.user)[:20]
        serializer = SearchQueryResultSerializer(queries, many=True)
        return success_response(data=serializer.data)


class CompanySearchView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

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


class URLScanTestView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        domain = request.data.get('domain')
        if not domain:
            return error_response('Domain parameter is required.', status_code=400)

        urlscan_api_key = config("URLSCAN_API_KEY", default="")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        if urlscan_api_key:
            headers["API-Key"] = urlscan_api_key

        # Step 1: Search recent scans
        search_url = "https://urlscan.io/api/v1/search/"
        params = {"q": f"page.domain:{domain}", "size": 5}
        try:
            resp = requests.get(search_url, params=params, headers=headers, timeout=10)
            if resp.status_code != 200:
                return error_response(f"URLScan Search failed with status code {resp.status_code}: {resp.text}", status_code=502)
            
            search_data = resp.json()
            results = search_data.get("results", [])
            if not results:
                return success_response(
                    data={"technologies": []},
                    message=f"No recent scans found for domain '{domain}'. Please perform a manual scan on urlscan.io."
                )

            uuid = results[0].get("_id")
            # Step 2: Fetch scan results
            result_url = f"https://urlscan.io/api/v1/result/{uuid}/"
            res_response = requests.get(result_url, headers=headers, timeout=10)
            if res_response.status_code != 200:
                return error_response(f"Failed to fetch scan details for UUID {uuid}: Status {res_response.status_code}", status_code=502)
            
            res_data = res_response.json()
            processors = res_data.get("meta", {}).get("processors", {})
            wappa = processors.get("wappa", {})
            tech_list = wappa.get("data", [])

            if not tech_list:
                lists = res_data.get("lists", {})
                if "technologies" in lists:
                    tech_list = [{"app": t, "categories": []} for t in lists.get("technologies", [])]

            formatted_techs = []
            for tech in tech_list:
                raw_cats = tech.get("categories", [])
                categories_list = []
                for c in raw_cats:
                    if isinstance(c, dict):
                        categories_list.append(c.get("name") or c.get("id") or str(c))
                    else:
                        categories_list.append(str(c))
                formatted_techs.append({
                    "name": tech.get("app", "Unknown"),
                    "categories": categories_list,
                    "version": tech.get("version", "")
                })

            return success_response(data={"uuid": uuid, "technologies": formatted_techs})

        except Exception as e:
            return error_response(f"Error querying URLScan: {str(e)}", status_code=500)


class TheirStackTestView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        technology = request.data.get('technology')
        if not technology:
            return error_response('Technology parameter is required.', status_code=400)

        theirstack_api_key = config("THEIRSTACK_API_KEY", default="")
        if not theirstack_api_key:
            return error_response("THEIRSTACK_API_KEY is not configured on the server.", status_code=400)

        url = "https://api.theirstack.com/v1/companies/search"
        headers = {
            "Authorization": f"Bearer {theirstack_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "page": 0,
            "limit": 10,
            "company_technology_slug_or": [technology.strip().lower()]
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code != 200:
                return error_response(f"TheirStack search failed with status code {resp.status_code}: {resp.text}", status_code=502)

            data = resp.json()
            companies = data.get("companies", [])
            if not companies and isinstance(data, list):
                companies = data
            elif not companies and isinstance(data, dict):
                for key in ["results", "data", "items"]:
                    if key in data and isinstance(data[key], list):
                        companies = data[key]
                        break

            formatted_companies = []
            for company in companies:
                formatted_companies.append({
                    "name": company.get("name") or company.get("company_name") or "Unknown",
                    "domain": company.get("domain") or company.get("website") or "N/A",
                    "industry": company.get("industry") or "N/A",
                    "country": company.get("country") or company.get("location") or "N/A"
                })

            return success_response(data={"companies": formatted_companies})

        except Exception as e:
            return error_response(f"Error querying TheirStack: {str(e)}", status_code=500)