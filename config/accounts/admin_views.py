from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count

from organizations.models import Organization
from contacts.models import Contact
from leads.models import Lead
from deals.models import Deal

User = get_user_model()

class IsSuperUserOrStaff(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (request.user.is_superuser or request.user.is_staff)

class AdminSystemStatsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def get(self, request):
        total_users = User.objects.count()
        total_orgs = Organization.objects.count()
        total_contacts = Contact.objects.count()
        total_leads = Lead.objects.count()
        
        deals = Deal.objects.all()
        total_deals = deals.count()
        won_deals = deals.filter(stage='CLOSED_WON').count()
        
        closed_won_revenue = deals.filter(stage='CLOSED_WON').aggregate(total=Sum('value'))['total'] or 0
        
        data = {
            "total_users": total_users,
            "total_organizations": total_orgs,
            "total_contacts": total_contacts,
            "total_leads": total_leads,
            "total_deals": total_deals,
            "won_deals": won_deals,
            "closed_won_revenue": closed_won_revenue
        }
        return Response({"success": True, "data": data})

class AdminUsersListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def get(self, request):
        users = User.objects.all().order_by('-id')
        data = [{
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "phone": u.phone,
            "is_superuser": u.is_superuser,
            "is_staff": u.is_staff,
            "date_joined": u.date_joined
        } for u in users]
        return Response({"success": True, "data": data})

class AdminOrganizationsListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def get(self, request):
        orgs = Organization.objects.all().annotate(
            contacts_count=Count('contacts', distinct=True),
            members_count=Count('members', distinct=True)
        ).order_by('-id')
        
        data = [{
            "id": o.id,
            "name": o.name,
            "owner_email": o.owner.email,
            "owner_username": o.owner.username,
            "contacts_count": o.contacts_count,
            "members_count": o.members_count,
            "created_at": o.created_at
        } for o in orgs]
        return Response({"success": True, "data": data})

class AdminContactsListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def get(self, request):
        contacts = Contact.objects.all().select_related('organization').order_by('-id')
        data = [{
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "company": c.company,
            "job_title": c.job_title,
            "organization_name": c.organization.name,
            "created_at": c.created_at
        } for c in contacts]
        return Response({"success": True, "data": data})

class AdminLeadsListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsSuperUserOrStaff]

    def get(self, request):
        leads = Lead.objects.all().select_related('contact__organization').order_by('-id')
        data = [{
            "id": l.id,
            "title": f"Lead for {l.contact.first_name} {l.contact.last_name}",
            "status": l.status,
            "score": l.score,
            "contact_email": l.contact.email,
            "contact_name": f"{l.contact.first_name} {l.contact.last_name}",
            "organization_name": l.contact.organization.name,
            "created_at": l.created_at
        } for l in leads]
        return Response({"success": True, "data": data})
