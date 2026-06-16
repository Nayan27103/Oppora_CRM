from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from leads.models import Lead
from deals.models import Deal
from .models import Workflow
from .tasks import execute_workflow_task


@receiver(post_save, sender=Lead)
def trigger_lead_workflows(sender, instance, created, **kwargs):
    if not created:
        return
        
    org = instance.contact.organization
    workflows = Workflow.objects.filter(organization=org, is_active=True)
    
    for workflow in workflows:
        # Check if the workflow has a trigger node for 'lead_created'
        has_trigger = any(
            node.get('type') == 'crmTrigger' and 
            node.get('data', {}).get('event') == 'lead_created'
            for node in workflow.nodes
        )
        if has_trigger:
            context = {
                "model_name": "leads.Lead",
                "object_id": instance.id
            }
            execute_workflow_task.delay(str(workflow.id), context)


@receiver(pre_save, sender=Deal)
def cache_old_deal_stage(sender, instance, **kwargs):
    if instance.id:
        try:
            # Query db for current stage state
            old_deal = Deal.objects.only('stage').get(id=instance.id)
            instance._old_stage = old_deal.stage
        except Deal.DoesNotExist:
            instance._old_stage = None
    else:
        instance._old_stage = None


@receiver(post_save, sender=Deal)
def trigger_deal_workflows(sender, instance, created, **kwargs):
    # Deal stage updated event
    if created:
        return
        
    old_stage = getattr(instance, '_old_stage', None)
    if not old_stage or old_stage == instance.stage:
        return

    # Trigger deal stage updated workflow
    org = instance.lead.contact.organization
    workflows = Workflow.objects.filter(organization=org, is_active=True)
    
    for workflow in workflows:
        has_trigger = any(
            node.get('type') == 'crmTrigger' and 
            node.get('data', {}).get('event') == 'deal_stage_updated'
            for node in workflow.nodes
        )
        if has_trigger:
            context = {
                "model_name": "deals.Deal",
                "object_id": instance.id
            }
            execute_workflow_task.delay(str(workflow.id), context)
