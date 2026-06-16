import os
import sys
import django

# Add the config directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/../config'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from deals.views import DealListView

User = get_user_model()
factory = APIRequestFactory()

user = User.objects.get(email='nayan@gmail.com')

print("Testing Deals Permission Resolution:")
# Test DealListView with HTTP_X_WORKSPACE_ID
headers = {'HTTP_X_WORKSPACE_ID': '1'}
request = factory.get('/api/deals/', **headers)
force_authenticate(request, user=user)

view = DealListView.as_view()
try:
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print(f"Response data: {response.data}")
except Exception as e:
    import traceback
    traceback.print_exc()
