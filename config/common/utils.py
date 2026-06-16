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
