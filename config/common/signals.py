from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from organizations.models import Organization
from contacts.models import Contact
from leads.models import Lead
from activities.models import Activity
from deals.models import Deal

def clear_cache():
    cache.clear()

@receiver([post_save, post_delete], sender=Organization)
def organization_changed(sender, instance, **kwargs):
    clear_cache()

@receiver([post_save, post_delete], sender=Contact)
def contact_changed(sender, instance, **kwargs):
    clear_cache()

@receiver([post_save, post_delete], sender=Lead)
def lead_changed(sender, instance, **kwargs):
    clear_cache()

@receiver([post_save, post_delete], sender=Activity)
def activity_changed(sender, instance, **kwargs):
    clear_cache()

@receiver([post_save, post_delete], sender=Deal)
def deal_changed(sender, instance, **kwargs):
    clear_cache()
