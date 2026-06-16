from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Activity
from notifications.utils import create_notification
from .models import Activity
from .serializers import ActivitySerializer
import activities.serializers
import activities.models
from notifications.utils import create_notification
from notifications.tasks import (create_notification_task)



class ActivityCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = ActivitySerializer(
            data=request.data
        )

        if serializer.is_valid():

            activity = serializer.save()

            if activity.assigned_to:

                create_notification_task.delay(
                    activity.assigned_to.id,
                    "New Activity Assigned",
                    f"You have been assigned: {activity.title}"
                )

            return Response({
                "success": True,
                "message": "Activity created",
                "data": ActivitySerializer(
                    activity
                ).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
    
class ActivityListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.utils import get_active_org
        active_org = get_active_org(request)

        if active_org:
            activities = Activity.objects.select_related(
                "lead",
                "assigned_to"
                ).filter(
                lead__contact__organization=active_org
            ).distinct()
        else:
            activities = Activity.objects.none()

        serializer = ActivitySerializer(
            activities,
            many=True
        )

        return Response({
            "success": True,
            "data": serializer.data
        })

class ActivityUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):

        try:
            activity = Activity.objects.get(pk=pk)
        except Activity.DoesNotExist:
            return Response({
                "success": False,
                "message": "Activity not found"
            }, status=404)

        serializer = ActivitySerializer(
            activity,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            activity = serializer.save()

            return Response({
                "success": True,
                "message": "Activity updated",
                "data": ActivitySerializer(
                    activity
                ).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=400)
    
class ActivityDeleteView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):

        try:
            activity = Activity.objects.get(pk=pk)
        except Activity.DoesNotExist:
            return Response({
                "success": False,
                "message": "Activity not found"
            }, status=404)

        activity.delete()

        return Response({
            "success": True,
            "message": "Activity deleted",
            "data": ActivitySerializer(
                activity
            ).data
        })