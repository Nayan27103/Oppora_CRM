from django.db.models import Count, Sum, Avg, OuterRef, Subquery, Exists
from organizations.models import Organization
from contacts.models import Contact
from leads.models import Lead
from deals.models import Deal
from activities.models import Activity

def get_organizations_with_stats():
    """
    Demonstrates prefetch_related and annotate.
    Retrieves all contacts for organizations in a single query (avoiding N+1)
    and annotates the count of total deals.
    """
    orgs = Organization.objects.prefetch_related("contacts").annotate(
        deal_count=Count("contacts__leads__deals")
    )
    return orgs

def get_leads_with_contacts():
    """
    Demonstrates select_related.
    Performs a SQL JOIN to fetch Contact details alongside Lead in one query.
    """
    leads = Lead.objects.select_related("contact")
    return leads

def get_organization_revenue_stats():
    """
    Demonstrates aggregate.
    Aggregates overall statistics (sum and average) on won deals directly in SQL.
    """
    stats = Deal.objects.filter(stage="CLOSED_WON").aggregate(
        total_revenue=Sum("value"),
        average_deal_size=Avg("value")
    )
    return stats

def get_organizations_with_latest_deal():
    """
    Demonstrates Subquery and Exists.
    Annotates each Organization with the title of its latest Deal (via Subquery)
    and checks if any pending activities exist (via Exists).
    """
    latest_deal_subquery = Deal.objects.filter(
        lead__contact__organization=OuterRef("pk")
    ).order_by("-created_at")
    
    has_pending_activities = Activity.objects.filter(
        lead__contact__organization=OuterRef("pk"),
        completed=False
    )
    
    orgs = Organization.objects.annotate(
        latest_deal_title=Subquery(latest_deal_subquery.values("title")[:1]),
        has_pending_tasks=Exists(has_pending_activities)
    )
    return orgs
