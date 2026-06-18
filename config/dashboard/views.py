from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from organizations.models import Organization
from contacts.models import Contact
from leads.models import Lead
from activities.models import Activity
from django.db.models import Sum
from deals.models import Deal
from django.db.models import Sum, Count
from deals.models import Deal
from leads.models import Lead
from contacts.models import Contact
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from organizations.models import Organization
from contacts.models import Contact
from leads.models import Lead
from activities.models import Activity
from deals.models import Deal

from django.db.models import Sum


from django.core.cache import cache
from common.responses import success_response

class DashboardView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.utils import get_active_org
        active_org = get_active_org(request)
        active_org_id = active_org.id if active_org else 0
        cache_key = f"dashboard_data_{request.user.id}_{active_org_id}"
        data = cache.get(cache_key)
        
        if not data:
            if active_org:
                leads_qs = Lead.objects.filter(contact__organization=active_org).distinct()
                deals_qs = Deal.objects.filter(lead__contact__organization=active_org).distinct()
                contacts_qs = Contact.objects.filter(organization=active_org).distinct()
                activities_qs = Activity.objects.filter(lead__contact__organization=active_org).distinct()
            else:
                leads_qs = Lead.objects.none()
                deals_qs = Deal.objects.none()
                contacts_qs = Contact.objects.none()
                activities_qs = Activity.objects.none()

            organizations_qs = Organization.objects.filter(members__user=request.user).distinct()

            total_revenue = (
                deals_qs.filter(
                    stage="CLOSED_WON"
                ).aggregate(
                    total=Sum("value")
                )["total"] or 0
            )

            total_leads = leads_qs.count()

            total_deals = deals_qs.count()

            total_contacts = contacts_qs.count()

            pipeline_value = (
                deals_qs.exclude(
                    stage__in=[
                        "CLOSED_WON",
                        "CLOSED_LOST"
                    ]
                ).aggregate(
                    total=Sum("value")
                )["total"] or 0
            )

            data = {
                "organizations":
                    organizations_qs.count(),

                "contacts": total_contacts,

                "leads": total_leads,

                "activities":
                    activities_qs.count(),

                "deals": total_deals,

                "new_leads":
                    leads_qs.filter(
                        status="NEW"
                    ).count(),

                "contacted_leads":
                    leads_qs.filter(
                        status="CONTACTED"
                    ).count(),

                "qualified_leads":
                    leads_qs.filter(
                        status="QUALIFIED"
                    ).count(),

                "proposal_leads":
                    leads_qs.filter(
                        status="PROPOSAL"
                    ).count(),

                "won_leads":
                    leads_qs.filter(
                        status="WON"
                    ).count(),

                "lost_leads":
                    leads_qs.filter(
                        status="LOST"
                    ).count(),

                "completed_tasks":
                    activities_qs.filter(
                        completed=True
                    ).count(),

                "pending_tasks":
                    activities_qs.filter(
                        completed=False
                    ).count(),

                "closed_won_revenue":
                    total_revenue,

                "pipeline_value":
                    pipeline_value
            }
            cache.set(cache_key, data, timeout=60)

        return success_response(data=data, message="Dashboard statistics retrieved successfully") 