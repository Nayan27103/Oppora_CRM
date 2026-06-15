from celery import shared_task
from leads.models import Lead
from ai_assistant.services import generate_ai_response

@shared_task
def ai_lead_scoring_task(lead_id):
    try:
        lead = Lead.objects.get(id=lead_id)
    except Lead.DoesNotExist:
        return "Lead not found"

    prompt = (
        f"Analyze this CRM Lead and return a score between 0 and 100 based on the status and notes.\n"
        f"Lead Status: {lead.status}\n"
        f"Lead Notes: {lead.notes}\n"
        f"Respond with ONLY a single integer value between 0 and 100. Do not include any other text."
    )

    try:
        response_text = generate_ai_response(prompt)
        import re
        match = re.search(r'\d+', response_text)
        if match:
            score = int(match.group(0))
            score = min(max(score, 0), 100)
        else:
            score = 50
    except Exception:
        score = 40

    lead.score = score
    lead.save()
    return f"Lead {lead_id} scored: {score}"
