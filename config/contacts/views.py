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

        serializer = ContactSerializer(
            data=request.data
        )

        if serializer.is_valid():

            contact = serializer.save()

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
        from common.utils import get_active_org
        active_org = get_active_org(request)

        search = request.GET.get("search")

        if active_org:
            contacts = Contact.objects.filter(
                organization=active_org
            ).distinct()
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

        try:
            contact = Contact.objects.get(
                id=pk
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

        try:

            contact = Contact.objects.get(
                id=pk
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

        contacts_data = request.data

        contacts = []

        for item in contacts_data:

            organization_id = item.get(
                "organization_id"
            )

            if not Organization.objects.filter(
                id=organization_id
            ).exists():

                return Response({
                    "success": False,
                    "message": f"Organization {organization_id} does not exist"
                }, status=400)

            contacts.append(
                Contact(
                    organization_id=organization_id,
                    first_name=item["first_name"],
                    last_name=item.get("last_name", ""),
                    email=item["email"],
                    phone=item.get("phone", ""),
                    company=item.get("company", "")
                )
            )

        Contact.objects.bulk_create(
            contacts
        )

        return Response({
            "success": True,
            "message": f"{len(contacts)} contacts created"
        })