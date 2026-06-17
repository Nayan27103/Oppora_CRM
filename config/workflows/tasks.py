from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.apps import apps
import logging

from .models import Workflow, WorkflowRun
from notifications.utils import send_email_notification

logger = logging.getLogger(__name__)


def get_nested_attr(obj, attr_path):
    """Recursively fetch nested attributes (e.g., 'contact.email')."""
    for part in attr_path.split('.'):
        if not obj:
            return None
        # Try getting attribute or item if dictionary
        if isinstance(obj, dict):
            obj = obj.get(part, None)
        else:
            obj = getattr(obj, part, None)
    return obj


def evaluate_condition(obj, condition):
    """
    Evaluates a single condition like:
    { "field": "score", "operator": ">=", "value": "80" }
    """
    field = condition.get('field')
    operator = condition.get('operator')
    target_value = condition.get('value')

    if not field or not operator:
        return False

    actual_value = get_nested_attr(obj, field)
    if actual_value is None:
        return False

    # Standardize types for comparison
    try:
        # Try converting to float/int if comparing numbers
        if str(target_value).replace('.', '', 1).isdigit():
            actual_value = float(actual_value)
            target_value = float(target_value)
        else:
            actual_value = str(actual_value).strip().lower()
            target_value = str(target_value).strip().lower()
    except Exception:
        actual_value = str(actual_value)
        target_value = str(target_value)

    if operator == '==':
        return actual_value == target_value
    elif operator == '!=':
        return actual_value != target_value
    elif operator == '>=':
        return actual_value >= target_value
    elif operator == '<=':
        return actual_value <= target_value
    elif operator == '>':
        return actual_value > target_value
    elif operator == '<':
        return actual_value < target_value
    elif operator == 'contains':
        return target_value in actual_value

    return False


def run_node_action(node, obj):
    """
    Runs the specific code/action associated with the node.
    Returns: (output_dict, outgoing_handle_name)
    """
    node_type = node.get('type')
    data = node.get('data', {})

    if node_type == 'crmTrigger':
        return {"status": "triggered"}, None

    elif node_type == 'conditionBlock':
        # Condition node: evaluate conditions
        single_field = data.get('field')
        if single_field:
            conditions = [{
                'field': single_field,
                'operator': data.get('operator', '=='),
                'value': data.get('value', '')
            }]
        else:
            conditions = data.get('conditions', [])

        match_type = data.get('match_type', 'all')  # all, any

        if not conditions:
            return {"result": False}, "false_branch"

        results = [evaluate_condition(obj, cond) for cond in conditions]
        is_match = all(results) if match_type == 'all' else any(results)

        return {"result": is_match}, ("true_branch" if is_match else "false_branch")

    elif node_type == 'createTask':
        # Action: Create Activity Task
        from activities.models import Activity
        
        # Check if the target object is a Lead, or has a lead relation
        lead_obj = None
        from leads.models import Lead
        if isinstance(obj, Lead):
            lead_obj = obj
        else:
            # Try to find associated lead
            lead_attr = getattr(obj, 'lead', None)
            if isinstance(lead_attr, Lead):
                lead_obj = lead_attr

        if not lead_obj:
            raise ValueError("Cannot create a task: No Lead object found in the trigger context.")

        days_due = int(data.get('days_due', 1))
        title = data.get('title', 'Follow up on lead')
        description = data.get('description', '')
        activity_type = data.get('activity_type', 'TASK')

        # Determine assignment: default to workspace owner
        assigned_to = lead_obj.contact.organization.owner
        
        activity = Activity.objects.create(
            lead=lead_obj,
            activity_type=activity_type,
            title=title,
            description=description,
            due_date=timezone.now() + timedelta(days=days_due),
            assigned_to=assigned_to
        )

        return {
            "activity_id": activity.id,
            "title": activity.title,
            "assigned_to": assigned_to.email
        }, None

    elif node_type == 'sendEmail':
        # Action: Send email notification
        recipient_type = data.get('recipient_type', 'contact') # contact, owner, custom
        subject = data.get('subject', 'CRM Notification')
        body = data.get('body', '')

        recipient_user = None
        recipient_email = None

        if recipient_type == 'contact':
            # Get associated contact
            contact = getattr(obj, 'contact', None)
            if contact:
                recipient_email = contact.email
        elif recipient_type == 'owner':
            # Get organization owner
            contact = getattr(obj, 'contact', None)
            if contact and contact.organization:
                recipient_user = contact.organization.owner
                recipient_email = recipient_user.email
        elif recipient_type == 'custom':
            recipient_email = data.get('custom_email')

        if not recipient_email:
            raise ValueError(f"Could not resolve recipient email for type '{recipient_type}'.")

        # Dispatch the email notification
        if recipient_user:
            send_email_notification(recipient_user, subject, body)
        else:
            # Create a mock user or send via direct email sending function
            from django.contrib.auth import get_user_model
            User = get_user_model()
            # Try to resolve to a user or dispatch email directly
            user = User.objects.filter(email=recipient_email).first()
            if user:
                send_email_notification(user, subject, body)
            else:
                # Direct dispatch fallback using core settings backend
                from django.core.mail import send_mail
                from django.conf import settings
                send_mail(
                    subject,
                    body,
                    settings.DEFAULT_FROM_EMAIL or 'noreply@oppora.com',
                    [recipient_email],
                    fail_silently=False,
                )

        return {
            "recipient": recipient_email,
            "subject": subject
        }, None

    raise ValueError(f"Unknown node type: {node_type}")


@shared_task(bind=True, max_retries=1)
def execute_workflow_task(self, workflow_id, context):
    logger.info(f"Starting workflow run for workflow_id={workflow_id}")
    
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        logger.error(f"Workflow {workflow_id} does not exist.")
        return

    run = WorkflowRun.objects.create(
        workflow=workflow,
        trigger_context=context,
        status='RUNNING'
    )

    try:
        # 1. Resolve Django object
        model_name = context.get('model_name')
        object_id = context.get('object_id')
        if not model_name or not object_id:
            raise ValueError("Invalid trigger context: model_name and object_id are required.")

        Model = apps.get_model(model_name)
        obj = Model.objects.get(id=object_id)

        # 2. Parse edges into an adjacency list
        # Map source -> list of {"target": target_id, "handle": handle_name}
        adjacency_list = {}
        for edge in workflow.edges:
            source = edge.get('source')
            target = edge.get('target')
            handle = edge.get('sourceHandle')  # e.g., 'true_branch' / 'false_branch'
            
            if source not in adjacency_list:
                adjacency_list[source] = []
            adjacency_list[source].append({"target": target, "handle": handle})

        # 3. Locate trigger node
        trigger_nodes = [n for n in workflow.nodes if n.get('type') == 'crmTrigger']
        if not trigger_nodes:
            raise ValueError("No trigger node found in this workflow.")
        
        current_node_id = trigger_nodes[0].get('id')
        nodes_dict = {n.get('id'): n for n in workflow.nodes}

        logs = []
        visited = set()

        # 4. Traverse node path
        while current_node_id:
            if current_node_id in visited:
                raise ValueError("Infinite execution loop detected in workflow graph.")
            visited.add(current_node_id)

            node = nodes_dict.get(current_node_id)
            if not node:
                break

            # Execute node logic
            node_type = node.get('type')
            node_data = node.get('data', {})
            if node_type == 'sendEmail' and node_data.get('subject'):
                node_label = f"Send Email: {node_data.get('subject')}"
            elif node_type == 'createTask' and node_data.get('title'):
                node_label = f"Create Task: {node_data.get('title')}"
            else:
                node_label = node_data.get('label', node_type)

            try:
                output, next_handle = run_node_action(node, obj)
                logs.append({
                    "node_id": current_node_id,
                    "node_type": node_type,
                    "node_label": node_label,
                    "status": "SUCCESS",
                    "output": output
                })
            except Exception as node_err:
                logs.append({
                    "node_id": current_node_id,
                    "node_type": node_type,
                    "node_label": node_label,
                    "status": "FAILED",
                    "error": str(node_err)
                })
                raise node_err

            # Find next node in path
            connections = adjacency_list.get(current_node_id, [])
            if not connections:
                break

            next_node_id = None
            for conn in connections:
                # If it's a branching edge, match the handle name
                if conn.get('handle') == next_handle or not conn.get('handle'):
                    next_node_id = conn.get('target')
                    break
            
            current_node_id = next_node_id

        run.status = 'COMPLETED'
        run.execution_log = logs
        run.completed_at = timezone.now()
        run.save(update_fields=['status', 'execution_log', 'completed_at'])

    except Exception as exc:
        logger.exception(f"Workflow execution failed: {exc}")
        run.status = 'FAILED'
        run.error_message = str(exc)
        run.completed_at = timezone.now()
        run.save(update_fields=['status', 'error_message', 'completed_at'])
