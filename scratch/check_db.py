import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from leads.models import Lead
from contacts.models import Contact
from organizations.models import Organization, TeamMember
from deals.models import Deal
from activities.models import Activity

User = get_user_model()

print("--- Users ---")
for u in User.objects.all():
    print(f"ID: {u.id}, Email: {u.email}, Username: {u.username}")

print("\n--- Organizations ---")
for org in Organization.objects.all():
    members = [m.user.email for m in org.members.all()]
    print(f"ID: {org.id}, Name: {org.name}, Owner: {org.owner.email}, Members: {members}")

print("\n--- Leads ---")
for lead in Lead.objects.all():
    contact = lead.contact
    org = contact.organization if contact else None
    print(f"Lead ID: {lead.id}, Status: {lead.status}, Contact: {contact.first_name if contact else None}, Org: {org.name if org else None}")

print(f"\nTotal Lead count in DB: {Lead.objects.count()}")
print(f"Total Contact count in DB: {Contact.objects.count()}")
print(f"Total Organization count in DB: {Organization.objects.count()}")
print(f"Total Deal count in DB: {Deal.objects.count()}")
print(f"Total Activity count in DB: {Activity.objects.count()}")
