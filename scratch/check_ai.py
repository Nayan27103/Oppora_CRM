import os
import sys
import django

# Add the config directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/../config'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from ai_assistant.views import AIChatView, MeetingNotesView

User = get_user_model()
factory = APIRequestFactory()

user = User.objects.first()

print(f"Testing with user: {user.email if user else 'No User Found'}")
if user:
    # 1. Test AIChatView
    print("\n--- Testing AIChatView ---")
    chat_view = AIChatView.as_view()
    chat_request = factory.post('/api/ai/chat/', {'message': 'Tell me about my leads'}, format='json')
    force_authenticate(chat_request, user=user)
    chat_response = chat_view(chat_request)
    
    # Render response to execute the GlobalJSONRenderer
    chat_response.render()
    print(f"Status: {chat_response.status_code}")
    print(f"Response Content: {chat_response.content.decode('utf-8')}")
    
    # 2. Test MeetingNotesView
    print("\n--- Testing MeetingNotesView ---")
    notes_view = MeetingNotesView.as_view()
    notes_request = factory.post('/api/ai/meeting-notes/', {'meeting_text': 'Follow up with client tomorrow.'}, format='json')
    force_authenticate(notes_request, user=user)
    notes_response = notes_view(notes_request)
    
    # Render response to execute the GlobalJSONRenderer
    notes_response.render()
    print(f"Status: {notes_response.status_code}")
    print(f"Response Content: {notes_response.content.decode('utf-8')}")
