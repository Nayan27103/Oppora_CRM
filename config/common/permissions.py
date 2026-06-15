from organizations.models import TeamMember


# common/permissions.py

from rest_framework.permissions import BasePermission
from organizations.models import TeamMember


class IsOrganizationMember(BasePermission):

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsOrganizationAdmin(BasePermission):

    def has_permission(self, request, view):

        organization_id = request.data.get(
            "organization_id"
        )

        if not organization_id:
            return False

        return TeamMember.objects.filter(
            user=request.user,
            organization_id=organization_id,
            role="ADMIN"
        ).exists()

def user_is_org_member(user, organization):
    return TeamMember.objects.filter(
        user=user,
        organization=organization
    ).exists()