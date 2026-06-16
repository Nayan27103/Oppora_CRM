import os
import sys
import django

# Add the config directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/../config'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from accounts.views import LoginView

factory = APIRequestFactory()
view = LoginView.as_view()

print("Testing Backend Login:")
request = factory.post('/api/accounts/login/', {'email': 'nayan@gmail.com', 'password': 'password123'}, format='json')
try:
    response = view(request)
    print(f"Status Code: {response.status_code}")
    print(f"Content: {response.data}")
except Exception as e:
    import traceback
    print("Exception occurred:")
    traceback.print_exc()
