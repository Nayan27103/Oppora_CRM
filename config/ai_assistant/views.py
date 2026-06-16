from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from leads.models import Lead
from deals.models import Deal

from .services import generate_ai_response

from .serializers import (
    EmailGeneratorSerializer,
    LeadSummarySerializer,
    MeetingNotesSerializer,
    LeadScoreSerializer
)



class EmailGeneratorView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = EmailGeneratorSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        lead = Lead.objects.get(
            id=serializer.validated_data["lead_id"]
        )

        prompt = f"""
        Write a professional sales email.

        Contact:
        {lead.contact.first_name}

        Goal:
        {serializer.validated_data['goal']}
        """

        result = generate_ai_response(
            prompt
        )

        return Response({
            "success": True,
            "email": result
        })
    

class LeadSummaryView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = LeadSummarySerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        lead = Lead.objects.get(
            id=serializer.validated_data["lead_id"]
        )

        prompt = f"""
        Summarize this lead.

        Name:
        {lead.contact.first_name}

        Company:
        {lead.contact.company}

        Status:
        {lead.status}

        Notes:
        {lead.notes}
        """

        result = generate_ai_response(
            prompt
        )

        return Response({
            "success": True,
            "summary": result
        })
    
class MeetingNotesView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = MeetingNotesSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        prompt = f"""
        Convert these meeting notes
        into clean action items.

        {serializer.validated_data['meeting_text']}
        """

        result = generate_ai_response(
            prompt
        )

        return Response({
            "success": True,
            "notes": result
        })
    
class LeadScoreView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = LeadScoreSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        lead = Lead.objects.get(
            id=serializer.validated_data["lead_id"]
        )

        prompt = f"""
        Score this lead from 1-100.

        Name:
        {lead.contact.first_name}

        Company:
        {lead.contact.company}

        Status:
        {lead.status}

        Notes:
        {lead.notes}

        Return only score.
        """

        result = generate_ai_response(
            prompt
        )

        return Response({
            "success": True,
            "score": result
        })
    

from .services import generate_ai_response


class AIChatView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        message = request.data.get("message")

        if not message:

            return Response({
                "success": False,
                "message": "Message is required"
            }, status=400)

        from common.utils import get_active_org
        active_org = get_active_org(request)

        if active_org:
            qualified_leads = Lead.objects.filter(
                contact__organization=active_org,
                status="QUALIFIED"
            ).distinct()

            deals = Deal.objects.filter(
                lead__contact__organization=active_org
            ).distinct()
        else:
            qualified_leads = Lead.objects.none()
            deals = Deal.objects.none()

        lead_data = []

        for lead in qualified_leads:

            lead_data.append({
                "name": lead.contact.first_name,
                "company": lead.contact.company,
                "status": lead.status,
                "score": lead.score
            })

        deal_data = []

        for deal in deals:

            deal_data.append({
                "title": deal.title,
                "value": str(deal.value),
                "stage": deal.stage
            })

        prompt = f"""
        You are a CRM Assistant.

        User Question:
        {message}

        Qualified Leads:
        {lead_data}

        Deals:
        {deal_data}

        Answer based on CRM data.
        """

        result = generate_ai_response(prompt)

        return Response({
            "success": True,
            "response": result
        })