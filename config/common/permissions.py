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

class OrganizationRolePermission(BasePermission):
    allowed_roles = []

    def get_organization_id(self, request, view):
        # 1. Check path parameter kwargs
        org_id = view.kwargs.get("organization_id") or view.kwargs.get("org_id")
        if org_id:
            return org_id
        
        # 2. Check if the view queryset is Organization
        if hasattr(view, 'queryset') and view.queryset and view.queryset.model.__name__ == 'Organization':
            org_id = view.kwargs.get("pk")
            if org_id:
                return org_id
        
        # 3. Check request body data
        if request.data and isinstance(request.data, dict):
            org_id = request.data.get("organization_id")
            if org_id:
                return org_id
                
        # 4. Check query parameters
        org_id = request.query_params.get("organization_id")
        return org_id

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # For detail / object-level endpoints, let has_object_permission handle it
        if any(k in view.kwargs for k in ['pk', 'id']):
            return True
            
        org_id = self.get_organization_id(request, view)
        if not org_id:
            return False
            
        return TeamMember.objects.filter(
            user=request.user,
            organization_id=org_id,
            role__in=self.allowed_roles
        ).exists()

    def has_object_permission(self, request, view, obj):
        org = None
        if obj.__class__.__name__ == 'Organization':
            org = obj
        elif hasattr(obj, 'organization'):
            org = obj.organization
        elif hasattr(obj, 'lead') and hasattr(obj.lead, 'contact') and hasattr(obj.lead.contact, 'organization'):
            org = obj.lead.contact.organization
        elif hasattr(obj, 'contact') and hasattr(obj.contact, 'organization'):
            org = obj.contact.organization

        if not org:
            return False

        return TeamMember.objects.filter(
            user=request.user,
            organization=org,
            role__in=self.allowed_roles
        ).exists()

class IsOrgAdmin(OrganizationRolePermission):
    allowed_roles = ["ADMIN"]

class IsOrgManager(OrganizationRolePermission):
    allowed_roles = ["ADMIN", "MANAGER"]

class IsOrgMember(OrganizationRolePermission):
    allowed_roles = ["ADMIN", "MANAGER", "MEMBER"]