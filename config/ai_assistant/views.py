from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from leads.models import Lead
from deals.models import Deal
from contacts.models import Contact
from workflows.models import Workflow
from organizations.models import TeamMember

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

        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        try:
            lead = Lead.objects.get(
                id=serializer.validated_data["lead_id"],
                contact__organization=active_org
            )
        except Lead.DoesNotExist:
            return Response({
                "success": False,
                "message": "Lead not found in active organization"
            }, status=404)

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

        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        try:
            lead = Lead.objects.get(
                id=serializer.validated_data["lead_id"],
                contact__organization=active_org
            )
        except Lead.DoesNotExist:
            return Response({
                "success": False,
                "message": "Lead not found in active organization"
            }, status=404)

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

        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

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

        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        try:
            lead = Lead.objects.get(
                id=serializer.validated_data["lead_id"],
                contact__organization=active_org
            )
        except Lead.DoesNotExist:
            return Response({
                "success": False,
                "message": "Lead not found in active organization"
            }, status=404)

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

        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        # Fetch active organization data
        contacts = Contact.objects.filter(organization=active_org)
        leads = Lead.objects.filter(contact__organization=active_org)
        deals = Deal.objects.filter(lead__contact__organization=active_org)
        workflows = Workflow.objects.filter(organization=active_org)
        team_members = TeamMember.objects.filter(organization=active_org).select_related('user')

        # Find current user's role in this active organization
        current_member = team_members.filter(user=request.user).first()
        current_user_role = current_member.role if current_member else "MEMBER"

        contacts_data = [{
            "name": f"{c.first_name} {c.last_name}".strip(),
            "email": c.email,
            "phone": c.phone,
            "company": c.company,
            "job_title": c.job_title
        } for c in contacts]

        leads_data = [{
            "contact_name": f"{l.contact.first_name} {l.contact.last_name}".strip() if l.contact else "Unknown",
            "contact_email": l.contact.email if l.contact else "",
            "status": l.status,
            "category": l.category,
            "score": l.score,
            "notes": l.notes
        } for l in leads]

        deals_data = [{
            "title": d.title,
            "value": str(d.value),
            "stage": d.stage,
            "contact_name": f"{d.lead.contact.first_name} {d.lead.contact.last_name}".strip() if (d.lead and d.lead.contact) else None
        } for d in deals]

        workflows_data = [{
            "name": w.name,
            "description": w.description,
            "is_active": w.is_active
        } for w in workflows]

        team_members_data = [{
            "username": m.user.username,
            "email": m.user.email,
            "role": m.role
        } for m in team_members]

        prompt = f"""
        You are a CRM AI Assistant for the organization '{active_org.name}'.
        
        The current user asking you questions is:
        Email: {request.user.email}
        Role in organization '{active_org.name}': {current_user_role}

        The user is asking a question: "{message}"

        Here is the EXCLUSIVE CRM and Organization data for organization '{active_org.name}' that the user has permission to access:
        
        Organization Team Members (Users belonging to the organization):
        {team_members_data}
        
        Contacts in the organization:
        {contacts_data}
        
        Leads in the organization:
        {leads_data}
        
        Deals in the organization:
        {deals_data}
        
        Workflows in the organization:
        {workflows_data}

        IMPORTANT SECURITY RULES:
        1. You ONLY have access to the data of the organization '{active_org.name}' provided in this prompt.
        2. If the user asks about any person (e.g. name like 'nayan', or email like 'nayan@gmail.com') or entity who is NOT listed in the provided data (neither in team members, contacts, nor leads), you must politely inform them that this person/entity does not exist or is not part of this organization, and you are not allowed to disclose any information about them.
        3. Do not make up or assume any data outside the provided context. If it's not in the context, it does not exist for the purpose of this query.
        """

        result = generate_ai_response(prompt)

        return Response({
            "success": True,
            "response": result
        })