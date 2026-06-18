import os
import sys
import django

# Setup Django Environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'config'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from workflows.models import Workflow, WorkflowRun
from leads.models import Lead

def debug():
    print("=== Workflows in Database ===")
    workflows = Workflow.objects.all()
    if not workflows.exists():
        print("No workflows found.")
    for w in workflows:
        print(f"ID: {w.id} | Name: {w.name} | Active: {w.is_active} | Org: {w.organization.id} ({w.organization.name})")
        print(f"Nodes count: {len(w.nodes)} | Edges count: {len(w.edges)}")
        for node in w.nodes:
            print(f"  - Node {node.get('id')}: Type={node.get('type')}, Data={node.get('data')}")
        print("-" * 40)

    print("\n=== Recent Workflow Runs ===")
    runs = WorkflowRun.objects.all().order_by('-started_at')[:10]
    if not runs.exists():
        print("No workflow runs found.")
    for r in runs:
        print(f"Run ID: {r.id} | Workflow: {r.workflow.name} | Status: {r.status} | Started: {r.started_at}")
        print(f"  Trigger Context: {r.trigger_context}")
        print(f"  Execution Log: {r.execution_log}")
        if r.error_message:
            print(f"  Error Message: {r.error_message}")
        print("-" * 40)

    print("\n=== Recent Leads ===")
    leads = Lead.objects.all().order_by('-created_at')[:5]
    for l in leads:
        print(f"Lead ID: {l.id} | Contact: {l.contact.first_name} | Org: {l.contact.organization.id} ({l.contact.organization.name}) | Category: {l.category} | Created: {l.created_at}")
        print("-" * 40)

if __name__ == '__main__':
    debug()
