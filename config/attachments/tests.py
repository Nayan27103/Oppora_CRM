from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from organizations.models import Organization, TeamMember
from contacts.models import Contact
from leads.models import Lead
from .models import Attachment

User = get_user_model()

class AttachmentViewsTestCase(APITestCase):
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
            status="NEW"
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
            status="NEW"
        )

    def test_upload_attachment_authorized(self):
        self.client.force_authenticate(user=self.user_a)
        file_data = SimpleUploadedFile("test.txt", b"file_content", content_type="text/plain")
        
        # Add workspace header for Org A
        response = self.client.post(
            "/api/attachments/upload/",
            {"lead": self.lead_a.id, "file": file_data},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_upload_attachment_unauthorized_lead_not_in_workspace(self):
        self.client.force_authenticate(user=self.user_a)
        file_data = SimpleUploadedFile("test.txt", b"file_content", content_type="text/plain")
        
        # Try to upload to lead B (belonging to Org B) using Workspace header of Org A
        response = self.client.post(
            "/api/attachments/upload/",
            {"lead": self.lead_b.id, "file": file_data},
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        # Should return 404 because Lead B does not exist in Org A
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_attachments_authorized(self):
        # Create an attachment first
        Attachment.objects.create(
            lead=self.lead_a,
            file=SimpleUploadedFile("existing.txt", b"existing content", content_type="text/plain"),
            uploaded_by=self.user_a
        )
        
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            f"/api/attachments/lead/{self.lead_a.id}/",
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_list_attachments_unauthorized_lead_not_in_workspace(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(
            f"/api/attachments/lead/{self.lead_b.id}/",
            HTTP_X_WORKSPACE_ID=str(self.org_a.id)
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
