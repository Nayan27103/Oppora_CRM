from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from notifications.utils import create_notification

from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(APIView):

    permission_classes = [
        IsAuthenticated
    ]
 

    def get(self, request):
        print(request.user)
        print(request.user.id) 

        notifications = Notification.objects.filter(
            user=request.user
        )

        serializer = NotificationSerializer(
            notifications,
            many=True
        )
        

        return Response({
            "success": True,
            "count": notifications.count(),
            "data": serializer.data
        })
    

class NotificationReadView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def patch(self, request, pk):

        try:

            notification = Notification.objects.get(
                id=pk,
                user=request.user
            )

        except Notification.DoesNotExist:

            return Response({
                "success": False,
                "message": "Notification not found"
            }, status=404)

        notification.is_read = True
        notification.save()

        return Response({
            "success": True,
            "message": "Notification marked as read"
        })
    
class NotificationReadAllView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def patch(self, request):

        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True
        )

        return Response({
            "success": True,
            "message": "All notifications marked as read"
        })
class NotificationDeleteView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def delete(self, request, pk):

        try:

            notification = Notification.objects.get(
                id=pk,
                user=request.user
            )

        except Notification.DoesNotExist:

            return Response({
                "success": False,
                "message": "Notification not found"
            }, status=404)

        notification.delete()

        return Response({
            "success": True,
            "message": "Notification deleted"
        })