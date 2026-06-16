from rest_framework import serializers
from .models import Workflow, WorkflowRun


class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = [
            'id',
            'organization',
            'name',
            'description',
            'nodes',
            'edges',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowRunSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)

    class Meta:
        model = WorkflowRun
        fields = [
            'id',
            'workflow',
            'workflow_name',
            'status',
            'trigger_context',
            'execution_log',
            'error_message',
            'started_at',
            'completed_at'
        ]
        read_only_fields = ['__all__']
