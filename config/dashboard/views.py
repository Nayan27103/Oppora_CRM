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
        cache_key = "dashboard_data"
        data = cache.get(cache_key)
        
        if not data:
            total_revenue = (
                Deal.objects.filter(
                    stage="CLOSED_WON"
                ).aggregate(
                    total=Sum("value")
                )["total"] or 0
            )

            total_leads = Lead.objects.count()

            total_deals = Deal.objects.count()

            total_contacts = Contact.objects.count()

            pipeline_value = (
                Deal.objects.exclude(
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
                    Organization.objects.count(),

                "contacts": total_contacts,

                "leads": total_leads,

                "activities":
                    Activity.objects.count(),

                "deals": total_deals,

                "new_leads":
                    Lead.objects.filter(
                        status="NEW"
                    ).count(),

                "contacted_leads":
                    Lead.objects.filter(
                        status="CONTACTED"
                    ).count(),

                "qualified_leads":
                    Lead.objects.filter(
                        status="QUALIFIED"
                    ).count(),

                "proposal_leads":
                    Lead.objects.filter(
                        status="PROPOSAL"
                    ).count(),

                "won_leads":
                    Lead.objects.filter(
                        status="WON"
                    ).count(),

                "lost_leads":
                    Lead.objects.filter(
                        status="LOST"
                    ).count(),

                "completed_tasks":
                    Activity.objects.filter(
                        completed=True
                    ).count(),

                "pending_tasks":
                    Activity.objects.filter(
                        completed=False
                    ).count(),

                "closed_won_revenue":
                    total_revenue,

                "pipeline_value":
                    pipeline_value
            }
            cache.set(cache_key, data, timeout=60)

        return success_response(data=data, message="Dashboard statistics retrieved successfully") 