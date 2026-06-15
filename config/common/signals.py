from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from organizations.models import Organization
from contacts.models import Contact
from leads.models import Lead
from activities.models import Activity
from deals.models import Deal

def clear_dashboard_cache():
    cache.delete("dashboard_data")

def clear_org_stats_cache():
    cache.delete("org_stats_data")

def clear_lead_stats_cache():
    cache.delete("lead_stats_data")

@receiver([post_save, post_delete], sender=Organization)
def organization_changed(sender, instance, **kwargs):
    clear_dashboard_cache()
    clear_org_stats_cache()

@receiver([post_save, post_delete], sender=Contact)
def contact_changed(sender, instance, **kwargs):
    clear_dashboard_cache()
    clear_org_stats_cache()

@receiver([post_save, post_delete], sender=Lead)
def lead_changed(sender, instance, **kwargs):
    clear_dashboard_cache()
    clear_lead_stats_cache()

@receiver([post_save, post_delete], sender=Activity)
def activity_changed(sender, instance, **kwargs):
    clear_dashboard_cache()

@receiver([post_save, post_delete], sender=Deal)
def deal_changed(sender, instance, **kwargs):
    clear_dashboard_cache()
