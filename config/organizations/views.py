from django.shortcuts import render
from django.db.models import Count
# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from common.permissions import IsOrganizationAdmin
from notifications.utils import create_notification, send_email_notification
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsOrganizationAdmin
from .models import Organization, TeamMember
from .serializers import OrganizationSerializer
from .models import (
    Organization,
    TeamMember
)

from .serializers import (
    OrganizationSerializer,
    TeamMemberSerializer,
    TeamMemberCreateSerializer
)

class OrganizationCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = OrganizationSerializer(
            data=request.data
        )

        if serializer.is_valid():

            organization = serializer.save(
                owner=request.user
            )
            TeamMember.objects.create(
                organization=organization,
                user=request.user,
                role="ADMIN"
            )

            return Response({
                "success": True,
                "message": "Organization created successfully",
                "data": OrganizationSerializer(
                    organization
                ).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class OrganizationListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        organizations = Organization.objects.prefetch_related(
            "contacts"
        ).filter(
            members__user=request.user
        ).distinct()

        serializer = OrganizationSerializer(
            organizations,
            many=True
        )

        return Response({
            "success": True,
            "data": serializer.data
        })
    
class TeamMemberCreateView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsOrganizationAdmin
    ]

    def post(self, request):

        serializer = TeamMemberCreateSerializer(
            data=request.data
        )

        if serializer.is_valid():

            organization_id = serializer.validated_data[
                "organization_id"
            ]

            try:
                organization = Organization.objects.get(
                    id=organization_id
                )

            except Organization.DoesNotExist:

                return Response(
                    {
                        "success": False,
                        "message": "Organization not found"
                    },
                    status=404
                )

            is_admin = TeamMember.objects.filter(
                organization=organization,
                user=request.user,
                role="ADMIN"
            ).exists()

            if not is_admin:

                return Response(
                    {
                        "success": False,
                        "message":
                        "Only organization admin can add members"
                    },
                    status=403
                )

            user = serializer.validated_data["user"]

            if TeamMember.objects.filter(
                organization=organization,
                user=user
            ).exists():

                return Response(
                    {
                        "success": False,
                        "message":
                        "User already exists in organization"
                    },
                    status=400
                )

            create_notification(
                user=user,
                title="Organization Invitation",
                message=f"You were added to {organization.name}"
            )
            send_email_notification(
                user=user,
                subject="You have been added to a new organization",
                message=(
                    f"Hello {user.username},\n\n"
                    f"You have been added to the organization '{organization.name}' as a {serializer.validated_data['role']}.\n"
                    "You can now access the organization and its CRM data.\n\n"
                    "Thank you,\n"
                    "Oppora CRM Team"
                )
            )
            member = TeamMember.objects.create(
                organization=organization,
                user=user,
                role=serializer.validated_data["role"]
            )

            return Response(
                {
                    "success": True,
                    "message":
                    "Member added successfully",
                    "data":
                    TeamMemberSerializer(
                        member
                    ).data
                }
            )

        return Response(
            {
                "success": False,
                "errors":
                serializer.errors
            },
            status=400
        )
    
class TeamMemberListView(
    APIView
):

    permission_classes = [
        IsAuthenticated
    ]

    def get(
        self,
        request,
        organization_id
    ):

        members = TeamMember.objects.filter(
            organization_id=organization_id
        )

        serializer = TeamMemberSerializer(
            members,
            many=True
        )

        return Response(
            {
                "success": True,
                "data":
                serializer.data
            }
        )
    
class OrganizationStatsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        organizations = Organization.objects.annotate(
            total_contacts=Count("contacts")
        )

        data = []

        for org in organizations:

            data.append({
                "id": org.id,
                "name": org.name,
                "total_contacts": org.total_contacts
            })

        return Response({
            "success": True,
            "data": data
        })