from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db.models import Sum
from leads.models import Lead
from deals.models import Deal
from contacts.models import Contact
from notifications.utils import send_email_notification

@shared_task
def daily_dashboard_summary():
    total_leads = Lead.objects.count()
    total_deals = Deal.objects.count()
    total_contacts = Contact.objects.count()
    
    summary_message = (
        f"Daily Dashboard Summary:\n"
        f"Total Leads: {total_leads}\n"
        f"Total Deals: {total_deals}\n"
        f"Total Contacts: {total_contacts}\n"
    )
    
    User = get_user_model()
    admins = User.objects.filter(is_superuser=True)
    for admin in admins:
        send_email_notification(admin, "Daily CRM Dashboard Summary", summary_message)
        
    return "Daily dashboard summary compiled and sent."

@shared_task
def daily_lead_reminder():
    yesterday = timezone.now() - timedelta(days=1)
    new_leads = Lead.objects.filter(status="NEW", created_at__gte=yesterday)
    
    if not new_leads.exists():
        return "No new leads to remind about."
        
    reminder_message = "Here is a list of new leads created in the last 24 hours requiring action:\n"
    for lead in new_leads:
        reminder_message += f"- Lead: {lead.contact.first_name} {lead.contact.last_name} (Email: {lead.contact.email})\n"
        
    User = get_user_model()
    users = User.objects.filter(is_active=True)
    for user in users:
        send_email_notification(user, "Action Required: New CRM Leads Reminder", reminder_message)
        
    return f"Daily lead reminder sent to {users.count()} users."

@shared_task
def weekly_deal_report():
    one_week_ago = timezone.now() - timedelta(days=7)
    won_deals = Deal.objects.filter(stage="CLOSED_WON", updated_at__gte=one_week_ago)
    
    total_revenue = won_deals.aggregate(total=Sum("value"))["total"] or 0
    deal_count = won_deals.count()
    
    report_message = (
        f"Weekly Closed-Won Deals Report:\n"
        f"Total Closed Won Deals: {deal_count}\n"
        f"Total Revenue: ${total_revenue:.2f}\n"
    )
    
    User = get_user_model()
    admins = User.objects.filter(is_superuser=True)
    for admin in admins:
        send_email_notification(admin, "Weekly Closed-Won Deals Report", report_message)
        
    return "Weekly deal report compiled and sent."
