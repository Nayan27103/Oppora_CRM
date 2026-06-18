from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from organizations.models import Organization, TeamMember
from contacts.models import Contact
from leads.models import Lead

User = get_user_model()

class AIAssistantViewsTestCase(APITestCase):
    def setUp(self):
        # Create user A and organization A
        self.user_a = User.objects.create_user(
            username="user_a",
            email="usera@test.com",
            password="password123"
        )
        self.org_a = Organization.objects.create(
            name="Org A",
            owner=self.user_a
        )
        TeamMember.objects.create(
            organization=self.org_a,
            user=self.user_a,
            role="ADMIN"
        )

        # Create user B and organization B
        self.user_b = User.objects.create_user(
            username="user_b",
            email="userb@test.com",
            password="password123"
        )
        self.org_b = Organization.objects.create(
            name="Org B",
            owner=self.user_b
        )
        TeamMember.objects.create(
            organization=self.org_b,
            user=self.user_b,
            role="ADMIN"
        )

        # Create lead under org A
        self.contact_a = Contact.objects.create(
            organization=self.org_a,
            first_name="Contact",
            last_name="A",
            email="contacta@test.com"
        )
        self.lead_a = Lead.objects.create(
            contact=self.contact_a,
            status="NEW",
            score=50
        )

        # Create lead under org B
        self.contact_b = Contact.objects.create(
            organization=self.org_b,
            first_name="Contact",
            last_name="B",
            email="contactb@test.com"
        )
        self.lead_b = Lead.objects.create(
            contact=self.contact_b,
            status="NEW",
            score=60
        )

    @patch("ai_assistant.views.generate_ai_response")
    def test_email_generator_authorized(self, mock_gen):
        mock_gen.return_value = "Mocked Email Content"
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/ai/email/",
            {"lead_id": self.lead_a.id, "goal": "Follow up"},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "Mocked Email Content")

    @patch("ai_assistant.views.generate_ai_response")
    def test_email_generator_unauthorized(self, mock_gen):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/ai/email/",
            {"lead_id": self.lead_b.id, "goal": "Follow up"},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("ai_assistant.views.generate_ai_response")
    def test_lead_summary_authorized(self, mock_gen):
        mock_gen.return_value = "Mocked Lead Summary"
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/ai/lead-summary/",
            {"lead_id": self.lead_a.id},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"], "Mocked Lead Summary")

    @patch("ai_assistant.views.generate_ai_response")
    def test_lead_summary_unauthorized(self, mock_gen):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/ai/lead-summary/",
            {"lead_id": self.lead_b.id},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("ai_assistant.views.generate_ai_response")
    def test_lead_score_authorized(self, mock_gen):
        mock_gen.return_value = "85"
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/ai/score/",
            {"lead_id": self.lead_a.id},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["score"], "85")

    @patch("ai_assistant.views.generate_ai_response")
    def test_lead_score_unauthorized(self, mock_gen):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/ai/score/",
            {"lead_id": self.lead_b.id},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
