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
from leads.views import LeadListView

User = get_user_model()
factory = APIRequestFactory()

user = User.objects.get(email='nayan@gmail.com')

# Clear cache first to start clean
from django.core.cache import cache
cache.clear()

print("Testing Workspace Filtering for User nayan@gmail.com:")

# Org ID 1: Nayan_workspace
# Org ID 3: admin_work

for org_id in [1, 3]:
    print(f"\n================ ORG ID: {org_id} ================")
    headers = {'HTTP_X_WORKSPACE_ID': str(org_id)}
    
    # 1. Test DashboardView
    dash_view = DashboardView.as_view()
    dash_request = factory.get('/api/dashboard/', **headers)
    force_authenticate(dash_request, user=user)
    dash_response = dash_view(dash_request)
    print(f"Dashboard - Total Leads: {dash_response.data['data']['leads']}")
    print(f"Dashboard - Contacts: {dash_response.data['data']['contacts']}")
    
    # 2. Test LeadListView
    lead_view = LeadListView.as_view()
    lead_request = factory.get('/api/leads/', **headers)
    force_authenticate(lead_request, user=user)
    lead_response = lead_view(lead_request)
    lead_names = [item['contact_name'] for item in lead_response.data['data']]
    print(f"Leads List Count: {len(lead_names)}")
    print(f"Leads List Names: {lead_names}")
