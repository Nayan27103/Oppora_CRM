from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Attachment
from .serializers import AttachmentSerializer


class AttachmentUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        lead_id = request.data.get('lead')
        if not lead_id:
            return Response({
                "success": False,
                "message": "Lead field is required"
            }, status=400)

        from leads.models import Lead
        try:
            lead = Lead.objects.get(id=lead_id, contact__organization=active_org)
        except Lead.DoesNotExist:
            return Response({
                "success": False,
                "message": "Lead not found in active organization"
            }, status=404)

        serializer = AttachmentSerializer(
            data=request.data
        )

        if serializer.is_valid():

            attachment = serializer.save(
                uploaded_by=request.user
            )

            return Response({
                "success": True,
                "message": "File uploaded successfully",
                "data": AttachmentSerializer(
                    attachment
                ).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)


class AttachmentListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, lead_id):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        from leads.models import Lead
        try:
            lead = Lead.objects.get(id=lead_id, contact__organization=active_org)
        except Lead.DoesNotExist:
            return Response({
                "success": False,
                "message": "Lead not found in active organization"
            }, status=404)

        attachments = Attachment.objects.filter(
            lead=lead
        ).distinct()

        serializer = AttachmentSerializer(
            attachments,
            many=True
        )

        return Response({
            "success": True,
            "count": attachments.count(),
            "data": serializer.data
        })


class AttachmentDeleteView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, attachment_id):
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found"
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN']):
            return permission_denied_response()

        try:
            attachment = Attachment.objects.get(
                id=attachment_id,
                lead__contact__organization=active_org
            )
        except Attachment.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attachment not found in active organization"
            }, status=404)

        attachment.delete()
        return Response({
            "success": True,
            "message": "Attachment deleted successfully"
        })