from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Lead
from .serializers import LeadSerializer 

class LeadCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = LeadSerializer(
            data=request.data
        )

        if serializer.is_valid():

            lead = serializer.save()

            # Trigger background AI lead scoring (Feature 5)
            from ai_assistant.tasks import ai_lead_scoring_task
            ai_lead_scoring_task.delay(lead.id)

            return Response({
                "success": True,
                "message": "Lead created successfully",
                "data": LeadSerializer(lead).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
    
class LeadListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.responses import success_response
        from common.utils import get_active_org

        active_org = get_active_org(request)
        status = request.GET.get("status")

        if active_org:
            leads = Lead.objects.select_related(
                "contact"
            ).filter(
                contact__organization=active_org
            ).distinct().order_by("-created_at")
        else:
            leads = Lead.objects.none()

        if status:
            leads = leads.filter(
                status=status
            )

        serializer = LeadSerializer(
            leads,
            many=True
        )

        return success_response(
            data=serializer.data,
            message="Leads retrieved successfully"
        )
class LeadUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):

        try:
            lead = Lead.objects.get(id=pk)

        except Lead.DoesNotExist:

            return Response({
                "success": False,
                "message": "Lead not found"
            }, status=404)

        serializer = LeadSerializer(
            lead,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response({
                "success": True,
                "message": "Lead updated",
                "data": serializer.data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
    
class LeadDeleteView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):

        try:
            lead = Lead.objects.get(id=pk)

        except Lead.DoesNotExist:

            return Response({
                "success": False,
                "message": "Lead not found"
            }, status=404)

        lead.delete()

        return Response({
            "success": True,
            "message": "Lead deleted"
        })
    
class LeadBulkUpdateView(APIView):

    permission_classes = [
        IsAuthenticated
    ]
    @transaction.atomic
    def patch(self, request):

        leads_data = request.data

        if not isinstance(
            leads_data,
            list
        ):
            return Response({
                "success": False,
                "message": "Payload must be a list"
            }, status=400)

        lead_ids = []

        for item in leads_data:

            if "id" not in item:

                return Response({
                    "success": False,
                    "message": "Each lead must have an id"
                }, status=400)

            lead_ids.append(
                item["id"]
            )

        leads = Lead.objects.filter(
            id__in=lead_ids
        )

        lead_map = {
            lead.id: lead
            for lead in leads
        }

        updated_leads = []

        for item in leads_data:

            lead = lead_map.get(
                item["id"]
            )

            if lead:

                lead.status = item.get(
                    "status",
                    lead.status
                )

                updated_leads.append(
                    lead
                )

        Lead.objects.bulk_update(
            updated_leads,
            ["status"]
        )

        return Response({
            "success": True,
            "message":
            f"{len(updated_leads)} leads updated"
        })

class LeadStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.core.cache import cache
        from common.responses import success_response
        from django.db.models import Count
        from common.utils import get_active_org

        active_org = get_active_org(request)
        active_org_id = active_org.id if active_org else 0
        cache_key = f"lead_stats_data_{request.user.id}_{active_org_id}"
        data = cache.get(cache_key)

        if not data:
            if active_org:
                stats = Lead.objects.filter(
                    contact__organization=active_org
                ).values("status").annotate(count=Count("id"))
            else:
                stats = []
            data = {item["status"]: item["count"] for item in stats}
            cache.set(cache_key, data, timeout=60)

        return success_response(data=data, message="Lead statistics retrieved successfully")