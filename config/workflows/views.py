from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from common.utils import get_active_org
from .models import Workflow, WorkflowRun
from .serializers import WorkflowSerializer, WorkflowRunSerializer


class WorkflowListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.utils import check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        workflows = Workflow.objects.filter(organization=active_org).order_by('-created_at')
        serializer = WorkflowSerializer(workflows, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        })

    def post(self, request):
        from common.utils import check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        # Inject organization
        data = request.data.copy()
        data['organization'] = active_org.id

        serializer = WorkflowSerializer(data=data)
        if serializer.is_valid():
            workflow = serializer.save()
            return Response({
                "success": True,
                "message": "Workflow created successfully",
                "data": WorkflowSerializer(workflow).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class WorkflowDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, org):
        try:
            return Workflow.objects.get(id=pk, organization=org)
        except Workflow.DoesNotExist:
            return None

    def get(self, request, pk):
        from common.utils import check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        workflow = self.get_object(pk, active_org)
        if not workflow:
            return Response({
                "success": False,
                "message": "Workflow not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkflowSerializer(workflow)
        return Response({
            "success": True,
            "data": serializer.data
        })

    def put(self, request, pk):
        from common.utils import check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER']):
            return permission_denied_response()

        workflow = self.get_object(pk, active_org)
        if not workflow:
            return Response({
                "success": False,
                "message": "Workflow not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkflowSerializer(workflow, data=request.data, partial=True)
        if serializer.is_valid():
            workflow = serializer.save()
            return Response({
                "success": True,
                "message": "Workflow updated successfully",
                "data": WorkflowSerializer(workflow).data
            })

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        from common.utils import check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not check_user_permission(request, active_org, ['ADMIN']):
            return permission_denied_response()

        workflow = self.get_object(pk, active_org)
        if not workflow:
            return Response({
                "success": False,
                "message": "Workflow not found"
            }, status=status.HTTP_404_NOT_FOUND)

        workflow.delete()
        return Response({
            "success": True,
            "message": "Workflow deleted successfully"
        })


class WorkflowRunListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from common.utils import check_user_permission, permission_denied_response
        active_org = get_active_org(request)
        if not active_org:
            return Response({
                "success": False,
                "message": "No active organization found."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not check_user_permission(request, active_org, ['ADMIN', 'MANAGER', 'MEMBER']):
            return permission_denied_response()

        workflow_id = request.GET.get('workflow_id')
        runs = WorkflowRun.objects.filter(workflow__organization=active_org)
        
        if workflow_id:
            runs = runs.filter(workflow_id=workflow_id)

        runs = runs.order_by('-started_at')[:50]  # Limit to last 50 runs for performance
        serializer = WorkflowRunSerializer(runs, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        })
