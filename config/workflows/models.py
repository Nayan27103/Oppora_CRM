import uuid
from django.db import models
from organizations.models import Organization


class Workflow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="workflows"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Store the React Flow canvas layout directly
    nodes = models.JSONField(help_text="React Flow nodes and parameters configuration", default=list)
    edges = models.JSONField(help_text="React Flow edges representing execution paths", default=list)
    
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class WorkflowRun(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name="runs"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    
    # Stores the target database object context (e.g., {"model_name": "leads.Lead", "object_id": 5})
    trigger_context = models.JSONField(default=dict)
    
    # Stores logs per executed node, e.g., [{"node_id": "node_trigger_1", "status": "SUCCESS", "output": {...}}]
    execution_log = models.JSONField(default=list)
    
    error_message = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.workflow.name} Run - {self.status}"
