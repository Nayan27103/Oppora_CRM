from organizations.models import Organization

def get_active_org(request):
    """
    Resolves the active organization/workspace for the request.
    Reads the 'X-Workspace-Id' header and ensures the authenticated user is a member.
    Falls back to the user's first organization if the header is missing or invalid.
    """
    if not request.user or not request.user.is_authenticated:
        return None

    org_id = request.META.get('HTTP_X_WORKSPACE_ID')
    if org_id:
        try:
            org_id = int(org_id)
            org = Organization.objects.filter(id=org_id, members__user=request.user).first()
            if org:
                return org
        except ValueError:
            pass

    # Fallback to the first organization the user is a member of
    return Organization.objects.filter(members__user=request.user).first()


def check_user_permission(request, active_org, allowed_roles):
    """
    Checks if the authenticated user has one of the allowed roles in the active organization.
    """
    if not request.user or not request.user.is_authenticated or not active_org:
        return False
    from organizations.models import TeamMember
    member = TeamMember.objects.filter(organization=active_org, user=request.user).first()
    if not member:
        return False
    return member.role in allowed_roles


def permission_denied_response(message="Permission denied for this action"):
    from rest_framework.response import Response
    return Response({
        "success": False,
        "message": message
    }, status=403)
