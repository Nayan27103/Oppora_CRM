from django.shortcuts import render
from django.db import transaction
# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from organizations.models import TeamMember
from django.db.models import Q
from .models import Contact
from .serializers import ContactSerializer
from rest_framework import status
from organizations.models import Organization
from common.pagination import CustomPagination



class ContactCreateView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        serializer = ContactSerializer(
            data=request.data
        )

        if serializer.is_valid():

            contact = serializer.save(organization=active_org)

            return Response({
                "success": True,
                "message":
                "Contact created successfully",
                "data":
                ContactSerializer(contact).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
class ContactListView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        search = request.GET.get("search")

        if active_org:
            contacts = Contact.objects.filter(
                organization=active_org
            ).distinct().order_by("-created_at")
        else:
            contacts = Contact.objects.none()

        if search:

            contacts = contacts.filter(

                Q(first_name__icontains=search)

                |

                Q(last_name__icontains=search)

                |

                Q(email__icontains=search)

                |

                Q(company__icontains=search)

            )

        paginator = CustomPagination()

        paginated_contacts = paginator.paginate_queryset(
            contacts,
            request
        )

        serializer = ContactSerializer(
            paginated_contacts,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )

class ContactUpdateView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def put(self, request, pk):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        try:
            contact = Contact.objects.get(
                id=pk,
                organization=active_org
            )

        except Contact.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                    "Contact not found"
                },
                status=404
            )

        serializer = ContactSerializer(
            contact,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response({
                "success": True,
                "message":
                "Contact updated",
                "data":
                serializer.data
            })

        return Response({
            "success": False,
            "errors":
            serializer.errors
        })
    
class ContactDeleteView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def delete(
        self,
        request,
        pk
    ):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN']):
            return permission_denied_response()

        try:

            contact = Contact.objects.get(
                id=pk,
                organization=active_org
            )

        except Contact.DoesNotExist:

            return Response(
                {
                    "success": False,
                    "message":
                    "Contact not found"
                },
                status=404
            )

        contact.delete()

        return Response(
            {
                "success": True,
                "message":
                "Contact deleted"
            }
        )
class ContactBulkCreateView(APIView):

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        contacts_data = request.data
        contacts = []

        for item in contacts_data:

            organization_id = item.get(
                "organization_id"
            )

            # Ensure user has ADMIN or MANAGER role of the organization they are importing into
            try:
                target_org = Organization.objects.get(id=organization_id)
                if not check_user_permission(request, target_org, ['ADMIN', 'MANAGER']):
                    return Response({
                        "success": False,
                        "message": f"Permission denied for organization {organization_id}"
                    }, status=403)
            except Organization.DoesNotExist:
                return Response({
                    "success": False,
                    "message": f"Organization {organization_id} does not exist"
                }, status=400)

            first_name = item.get("first_name") or "Discovered"
            last_name = item.get("last_name") or ""
            contacts.append(
                Contact(
                    organization_id=organization_id,
                    first_name=first_name,
                    last_name=last_name,
                    email=item["email"],
                    phone=item.get("phone", ""),
                    company=item.get("company", ""),
                    job_title=item.get("job_title", "")
                )
            )

        Contact.objects.bulk_create(
            contacts
        )

        return Response({
            "success": True,
            "message": f"{len(contacts)} contacts created"
        })