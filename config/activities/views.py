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
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        serializer = ActivitySerializer(
            data=request.data
        )

        if serializer.is_valid():
            # Validate that target lead belongs to active organization
            lead = serializer.validated_data.get("lead")
            if not lead or lead.contact.organization != active_org:
                return Response({
                    "success": False,
                    "message": "Lead does not belong to your active organization."
                }, status=403)

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
        from common.utils import get_active_org, check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization workspace selected."
            }, status=400)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        from django.db.models import F
        if active_org:
            activities = Activity.objects.select_related(
                "lead",
                "assigned_to"
                ).filter(
                lead__contact__organization=active_org,
                is_deleted=False
            ).order_by(F('due_date').asc(nulls_last=True)).distinct()
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
            activity = Activity.objects.get(pk=pk, lead__contact__organization=active_org)
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
            activity = Activity.objects.get(pk=pk, lead__contact__organization=active_org)
        except Activity.DoesNotExist:
            return Response({
                "success": False,
                "message": "Activity not found"
            }, status=404)

        if activity.is_deleted:
            activity.delete()
            return Response({
                "success": True,
                "message": "Activity permanently deleted"
            })
        else:
            activity.is_deleted = True
            activity.save()
            return Response({
                "success": True,
                "message": "Activity deleted",
                "data": ActivitySerializer(
                    activity
                ).data
            })

class ActivityDeletedListView(APIView):

    permission_classes = [IsAuthenticated]

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

        if active_org:
            activities = Activity.objects.select_related(
                "lead",
                "assigned_to"
            ).filter(
                lead__contact__organization=active_org,
                is_deleted=True
            ).order_by('-updated_at').distinct()
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

class ActivityRestoreView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
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
            activity = Activity.objects.get(pk=pk, lead__contact__organization=active_org)
        except Activity.DoesNotExist:
            return Response({
                "success": False,
                "message": "Activity not found"
            }, status=404)

        activity.is_deleted = False
        activity.save()

        return Response({
            "success": True,
            "message": "Activity restored",
            "data": ActivitySerializer(
                activity
            ).data
        })