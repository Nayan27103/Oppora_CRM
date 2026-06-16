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
    print("--- Initializing Lead Category Workflow Test ---")

    User = get_user_model()
    # 1. Fetch or create test user and org
    user, _ = User.objects.get_or_create(
        email="category_tester@example.com",
        defaults={"username": "cat_tester", "is_active": True}
    )
    user.set_password("catpass123")
    user.save()

    org, _ = Organization.objects.get_or_create(
        owner=user,
        defaults={"name": "Category Test Workspace"}
    )
    TeamMember.objects.get_or_create(organization=org, user=user, defaults={"role": "ADMIN"})

    # Clean up previous records for clean run
    Lead.objects.filter(contact__organization=org).delete()
    Workflow.objects.filter(organization=org).delete()

    # 2. Setup a visual nodes configuration (matching React Flow structure)
    # Trigger -> Condition (category == 'HOSPITAL') -> Task Action (if True)
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
                "field": "category",
                "operator": "==",
                "value": "HOSPITAL",
                "label": "Category == HOSPITAL"
            }
        },
        {
            "id": "node_action_task",
            "type": "createTask",
            "data": {
                "title": "Hospital Outreach Checklist",
                "activity_type": "TASK",
                "days_due": 1,
                "label": "Setup Hospital Task"
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
        name="Hospital Lead Intake Auto-Task",
        description="Schedules custom checklist whenever a Lead category is HOSPITAL",
        nodes=nodes,
        edges=edges,
        is_active=True
    )
    print(f"SUCCESS: Created Workflow rule: '{workflow.name}'")

    # 3. Create a test Contact & Lead with category = 'HOSPITAL'
    contact = Contact.objects.create(
        organization=org,
        first_name="Dr. Jane",
        last_name="Smith",
        email="janesmith@hospital.com",
        company="City Medical Clinic"
    )
    
    lead = Lead.objects.create(
        contact=contact,
        category="HOSPITAL",
        status="NEW"
    )
    print(f"SUCCESS: Created Lead: '{contact.first_name} {contact.last_name}' with category={lead.category}")

    # 4. Trigger the workflow task synchronously
    context = {
        "model_name": "leads.Lead",
        "object_id": lead.id
    }
    
    print("RUNNING: Executing category workflow task synchronously...")
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
    assert activity.activity_type == 'TASK', f"FAILED: Expected activity type TASK, got {activity.activity_type}"
    assert activity.title == "Hospital Outreach Checklist", f"FAILED: Expected title 'Hospital Outreach Checklist', got '{activity.title}'"
    
    print("\nSUCCESS: ALL CATEGORY WORKFLOW TESTS PASSED SUCCESSFULLY! Traversed and verified category-specific trigger and rules.")

if __name__ == '__main__':
    run_test()
