from django.shortcuts import render
from django.db.models import Count
# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from common.permissions import IsOrganizationAdmin, IsOrgAdmin, IsOrgManager, IsOrgMember
from notifications.utils import create_notification, send_email_notification
from rest_framework.permissions import IsAuthenticated
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
        IsOrgAdmin
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

            from notifications.tasks import create_notification_task, send_email_task
            create_notification_task.delay(
                user.id,
                "Organization Invitation",
                f"You were added to {organization.name}"
            )
            send_email_task.delay(
                user.id,
                "You have been added to a new organization",
                (
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
        IsAuthenticated,
        IsOrgMember
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
class OrganizationUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def patch(self, request, pk):
        try:
            organization = Organization.objects.get(id=pk)
        except Organization.DoesNotExist:
            return Response({
                "success": False,
                "message": "Organization not found"
            }, status=404)

        self.check_object_permissions(request, organization)

        serializer = OrganizationSerializer(
            organization,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Organization settings updated",
                "data": serializer.data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)

class OrganizationStatsView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.core.cache import cache
        from common.responses import success_response

        cache_key = "org_stats_data"
        data = cache.get(cache_key)

        if not data:
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
            
            cache.set(cache_key, data, timeout=60)
            
        return success_response(data=data, message="Organization statistics retrieved successfully")


class OrganizationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            org = Organization.objects.get(id=pk)
        except Organization.DoesNotExist:
            return Response({
                "success": False,
                "message": "Organization not found"
            }, status=status.HTTP_404_NOT_FOUND)

        if org.owner != request.user:
            return Response({
                "success": False,
                "message": "Only the workspace owner can delete this organization"
            }, status=status.HTTP_403_FORBIDDEN)

        org.delete()
        return Response({
            "success": True,
            "message": "Organization deleted successfully"
        })


class TeamMemberUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            member = TeamMember.objects.get(id=pk)
        except TeamMember.DoesNotExist:
            return Response({
                "success": False,
                "message": "Team member not found"
            }, status=status.HTTP_404_NOT_FOUND)

        is_admin = TeamMember.objects.filter(
            organization=member.organization,
            user=request.user,
            role="ADMIN"
        ).exists()
        if not is_admin:
            return Response({
                "success": False,
                "message": "Only organization admins can update member roles"
            }, status=status.HTTP_403_FORBIDDEN)

        if member.user == member.organization.owner:
            return Response({
                "success": False,
                "message": "Cannot change the role of the workspace owner"
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = TeamMemberSerializer(
            member,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Member role updated successfully",
                "data": serializer.data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class TeamMemberDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            member = TeamMember.objects.get(id=pk)
        except TeamMember.DoesNotExist:
            return Response({
                "success": False,
                "message": "Team member not found"
            }, status=status.HTTP_404_NOT_FOUND)

        is_admin = TeamMember.objects.filter(
            organization=member.organization,
            user=request.user,
            role="ADMIN"
        ).exists()
        is_self = member.user == request.user

        if not (is_admin or is_self):
            return Response({
                "success": False,
                "message": "Permission denied. Only admins can remove members, or members can leave themselves."
            }, status=status.HTTP_403_FORBIDDEN)

        if member.user == member.organization.owner:
            return Response({
                "success": False,
                "message": "Cannot remove the workspace owner from the organization"
            }, status=status.HTTP_400_BAD_REQUEST)

        member.delete()
        return Response({
            "success": True,
            "message": "Member removed successfully"
        })