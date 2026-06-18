from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Deal
from .serializers import DealSerializer
from django.db import transaction
from leads.models import Lead
from notifications.models import Notification
from common.permissions import IsOrgAdmin, IsOrgManager, IsOrgMember



# Create your views here.
class DealCreateView(APIView):

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

        lead_id = request.data.get("lead")
        if not lead_id:
            return Response({"success": False, "message": "Lead is required"}, status=400)
            
        try:
            lead = Lead.objects.get(id=lead_id, contact__organization=active_org)
        except Lead.DoesNotExist:
            return Response({"success": False, "message": "Lead not found"}, status=404)

        serializer = DealSerializer(
            data=request.data
        )

        if serializer.is_valid():

            deal = serializer.save()

            return Response({
                "success": True,
                "message": "Deal created",
                "data": DealSerializer(
                    deal
                ).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
    
class DealListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.responses import success_response
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        if active_org:
            deals = Deal.objects.select_related(
                "lead",
                "lead__contact"
                ).filter(
                lead__contact__organization=active_org
                ).distinct().order_by("-created_at")
        else:
            deals = Deal.objects.none()

        serializer = DealSerializer(
            deals,
            many=True
        )

        return success_response(
            data=serializer.data,
            message="Deals retrieved successfully"
        )
    
class DealUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        try:

            deal = Deal.objects.get(id=pk, lead__contact__organization=active_org)

        except Deal.DoesNotExist:

            return Response({
                "success": False,
                "message": "Deal not found"
            }, status=404)

        serializer = DealSerializer(
            deal,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            deal = serializer.save()

            return Response({
                "success": True,
                "message": "Deal updated",
                "data": DealSerializer(
                    deal
                ).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
    
class DealDeleteView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN']):
            return permission_denied_response()

        try:

            deal = Deal.objects.get(id=pk, lead__contact__organization=active_org)

        except Deal.DoesNotExist:

            return Response({
                "success": False,
                "message": "Deal not found"
            }, status=404)

        deal.delete()

        return Response({
            "success": True,
            "message": "Deal deleted"
        })


class ConvertLeadToDealView(APIView):

    permission_classes = [IsAuthenticated]

    @transaction.atomic
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

        lead_id = request.data.get("lead_id")

        title = request.data.get("title")

        value = request.data.get("value")

        try:

            try:

                lead = Lead.objects.get(
                    id=lead_id,
                    contact__organization=active_org
                )

            except Lead.DoesNotExist:

                return Response({
                    "success": False,
                    "message": "Lead not found"
                }, status=404)

            lead.status = "WON"
            lead.save()

            deal = Deal.objects.create(
                lead=lead,
                title=title,
                value=value,
                stage="DISCOVERY"
            )

            Notification.objects.create(
                user=request.user,
                title="Deal Created",
                message=f"Deal {deal.title} created successfully"
            )

            return Response({
                "success": True,
                "deal_id": deal.id
            })

        except Exception as e:

            raise transaction.TransactionManagementError(
                str(e)
            )