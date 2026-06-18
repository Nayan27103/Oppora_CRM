import os
import sys
import django

# Setup Django Environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from organizations.models import Organization, TeamMember
from contacts.models import Contact
from leads.models import Lead
from activities.models import Activity
from workflows.models import Workflow, WorkflowRun
from workflows.tasks import execute_workflow_task

def run_test():
    print("--- Initializing Workflow Integration Test ---")

    User = get_user_model()
    # 1. Fetch or create test user and org
    user, _ = User.objects.get_or_create(
        email="workflow_tester@example.com",
        defaults={"username": "tester", "is_active": True}
    )
    user.set_password("testpass123")
    user.save()

    org, _ = Organization.objects.get_or_create(
        owner=user,
        defaults={"name": "Test Workflow Workspace"}
    )
    TeamMember.objects.get_or_create(organization=org, user=user, defaults={"role": "ADMIN"})

    # Clean up previous records for clean run
    Lead.objects.filter(contact__organization=org).delete()
    Workflow.objects.filter(organization=org).delete()

    # 2. Setup a visual nodes configuration (matching React Flow structure)
    # Trigger -> Condition (score >= 80) -> Task Action (if True)
    nodes = [
        {
            "id": "node_trigger",
            "type": "crmTrigger",
            "data": {"event": "lead_created", "label": "Trigger: Lead Created"}
        },
        {
            "id": "node_condition",
            "type": "conditionBlock",
            "data": {
                "field": "score",
                "operator": ">=",
                "value": "80",
                "label": "Score >= 80"
            }
        },
        {
            "id": "node_action_task",
            "type": "createTask",
            "data": {
                "title": "Urgent Lead Outreach Task",
                "activity_type": "CALL",
                "days_due": 2,
                "label": "Schedule Urgent Call"
            }
        }
    ]

    edges = [
        {
            "id": "e_trigger_condition",
            "source": "node_trigger",
            "target": "node_condition"
        },
        {
            "id": "e_condition_task",
            "source": "node_condition",
            "target": "node_action_task",
            "sourceHandle": "true_branch"
        }
    ]

    workflow = Workflow.objects.create(
        organization=org,
        name="Auto Urgent Call Assignment",
        description="Automatically schedules an outreach task if lead score >= 80",
        nodes=nodes,
        edges=edges,
        is_active=True
    )
    print(f"SUCCESS: Created Workflow rule: '{workflow.name}'")

    # 3. Create a test Contact & Lead with score = 90 (should trigger and execute action)
    contact = Contact.objects.create(
        organization=org,
        first_name="John",
        last_name="Doe",
        email="johndoe@example.com",
        company="Initech"
    )
    
    lead = Lead.objects.create(
        contact=contact,
        score=90,
        status="NEW"
    )
    print(f"SUCCESS: Created target Lead: '{contact.first_name} {contact.last_name}' with score={lead.score}")

    # 4. Trigger the workflow task synchronously
    context = {
        "model_name": "leads.Lead",
        "object_id": lead.id
    }
    
    print("RUNNING: Executing workflow task synchronously...")
    execute_workflow_task(str(workflow.id), context)

    # 5. Assert results
    run = WorkflowRun.objects.filter(workflow=workflow).first()
    assert run is not None, "FAILED: WorkflowRun log was not created!"
    print(f"SUCCESS: WorkflowRun status: {run.status}")
    if run.error_message:
        print(f"FAILED: Execution error: {run.error_message}")

    assert run.status == 'COMPLETED', f"FAILED: Expected run status COMPLETED, got {run.status}"

    # Verify Activity task was created
    activity = Activity.objects.filter(lead=lead).first()
    assert activity is not None, "FAILED: Follow-up Activity was not created!"
    assert activity.activity_type == 'CALL', f"FAILED: Expected activity type CALL, got {activity.activity_type}"
    assert activity.title == "Urgent Lead Outreach Task", f"FAILED: Expected title 'Urgent Lead Outreach Task', got '{activity.title}'"
    
    print("\nSUCCESS: ALL TESTS PASSED SUCCESSFULLY! Workflow engine executed the DAG, checked conditions, and scheduled the task perfectly.")

if __name__ == '__main__':
    run_test()
