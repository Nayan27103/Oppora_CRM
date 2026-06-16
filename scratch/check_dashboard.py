import os
import sys
import django

# Add the config directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/../config'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from dashboard.views import DashboardView

User = get_user_model()
factory = APIRequestFactory()
view = DashboardView.as_view()

# Clear cache first to start clean
from django.core.cache import cache
cache.clear()

print("Checking Dashboard for each user:")
for u in User.objects.all():
    request = factory.get('/api/dashboard/')
    force_authenticate(request, user=u)
    response = view(request)
    data = response.data
    # Print the leads count and total leads breakdown
    print(f"\nUser: {u.email}")
    print(f"Status Code: {response.status_code}")
    print(f"Total Leads: {data['data']['leads']}")
    print(f"New Leads: {data['data']['new_leads']}")
    print(f"Contacted Leads: {data['data']['contacted_leads']}")
    print(f"Qualified Leads: {data['data']['qualified_leads']}")
    print(f"Proposal Leads: {data['data']['proposal_leads']}")
    print(f"Won Leads: {data['data']['won_leads']}")
    print(f"Lost Leads: {data['data']['lost_leads']}")
