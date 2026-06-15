from rest_framework.permissions import BasePermission

from .models import TeamMember


class IsOrganizationAdmin(
    BasePermission
):

    def has_permission(
        self,
        request,
        view
    ):

        organization_id = request.data.get(
            "organization_id"
        )

        if not organization_id:
            return False

        return TeamMember.objects.filter(
            organization_id=organization_id,
            user=request.user,
            role="ADMIN"
        ).exists()