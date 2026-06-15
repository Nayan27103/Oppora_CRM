from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Deal
from .serializers import DealSerializer
from django.db import transaction
from leads.models import Lead
from notifications.models import Notification



# Create your views here.
class DealCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

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

        deals = Deal.objects.select_related(
            "lead",
            "lead__contact"
            ).filter(
            lead__contact__organization__members__user=request.user
            ).distinct()

        serializer = DealSerializer(
            deals,
            many=True
        )

        return Response({
            "success": True,
            "count": deals.count(),
            "data": serializer.data
        })
    
class DealUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):

        try:

            deal = Deal.objects.get(id=pk)

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

        try:

            deal = Deal.objects.get(id=pk)

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

        lead_id = request.data.get("lead_id")

        title = request.data.get("title")

        value = request.data.get("value")

        try:

            try:

                lead = Lead.objects.get(
                    id=lead_id
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