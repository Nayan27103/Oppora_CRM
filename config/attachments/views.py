from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Attachment
from .serializers import AttachmentSerializer


class AttachmentUploadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

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

        attachments = Attachment.objects.filter(
            lead_id=lead_id,
            lead__contact__organization__members__user=request.user
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