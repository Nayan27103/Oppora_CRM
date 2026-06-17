import os
import sys
import django
import time

# Set up Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from leads.models import Lead
from contacts.models import Contact
from workflows.models import WorkflowRun

def test_run():
    # Find an existing contact in org 13
    contact = Contact.objects.filter(organization_id=13).first()
    if not contact:
        print("No contact in organization 13 found.")
        return

    print(f"Creating a new lead for contact {contact.email} (Org {contact.organization_id})...")
    lead = Lead.objects.create(
        contact=contact,
        status='NEW',
        category='IT',
        notes='Test note for dynamic label'
    )
    print(f"Lead created with ID: {lead.id}")

    # Wait for Celery worker to process the workflow task
    print("Waiting 5 seconds for Celery task to finish...")
    time.sleep(5)

    # Fetch the workflow runs associated with this lead
    runs = WorkflowRun.objects.filter(trigger_context__object_id=lead.id).order_by('-started_at')
    if not runs.exists():
        print("No workflow runs found for this lead yet.")
        return

    for run in runs:
        print(f"\nWorkflow Run ID: {run.id}")
        print(f"Workflow Name: {run.workflow.name}")
        print(f"Status: {run.status}")
        print("Execution Logs:")
        for log in run.execution_log or []:
            print(f"  - Node Type: {log.get('node_type')}, Label: {log.get('node_label')}, Status: {log.get('status')}, Output: {log.get('output') or log.get('error')}")

if __name__ == '__main__':
    test_run()
