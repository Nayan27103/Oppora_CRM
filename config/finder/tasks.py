from celery import shared_task
from django.db import transaction
import logging

from .models import SearchQuery
from .services import (
    HunterService,
    CompanyEnrichmentOrchestrator,
    WebScraperService,
    merge_and_deduplicate,
)
from contacts.models import Contact
from organizations.models import Organization

logger = logging.getLogger(__name__)

hunter       = HunterService()
enricher     = CompanyEnrichmentOrchestrator()   # AbstractAPI → scraper fallback
scraper      = WebScraperService()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_finder_and_import(self, search_query_id: int):
    try:
        query = SearchQuery.objects.get(id=search_query_id)
    except SearchQuery.DoesNotExist:
        return

    query.status = 'running'
    query.save(update_fields=['status'])

    try:
        org            = _get_or_create_user_org(query.user)
        contacts_count = 0
        companies_count = 0

        if query.domain:
            # ── People: Hunter (emails) + DDG scraper (names/titles) ──
            hunter_data    = hunter.search_by_domain(query.domain, limit=10)
            hunter_people  = hunter_data.get('people', [])

            scraped_people = scraper.search_people_duckduckgo(
                domain=query.domain,
                job_title=query.job_title,
            )

            all_people = merge_and_deduplicate(hunter_people, scraped_people)

            with transaction.atomic():
                for person in all_people:
                    email = person.get('email', '').strip()
                    if not email:
                        continue   # skip if no email — can't deduplicate safely
                    _, created = Contact.objects.get_or_create(
                        email=email,
                        organization=org,
                        defaults={
                            'first_name': person.get('first_name', ''),
                            'last_name':  person.get('last_name', ''),
                            'phone':      '',
                            'company':    person.get('company', ''),
                            'job_title':  person.get('job_title', ''),
                        }
                    )
                    if created:
                        contacts_count += 1

            # ── Company: AbstractAPI → scraper fallback ──
            if query.search_type in ('company', 'both'):
                company_data = enricher.enrich(query.domain)
                if company_data.get('name'):
                    _, created = Organization.objects.get_or_create(
                        name=company_data['name'],
                        defaults={'owner': query.user}
                    )
                    if created:
                        companies_count += 1

        query.status            = 'done'
        query.contacts_imported = contacts_count
        query.companies_imported = companies_count
        query.save(update_fields=['status', 'contacts_imported', 'companies_imported'])

    except Exception as exc:
        logger.exception(f'Finder task failed: {exc}')
        query.status        = 'failed'
        query.error_message = str(exc)
        query.save(update_fields=['status', 'error_message'])
        raise self.retry(exc=exc)


def _get_or_create_user_org(user):
    from organizations.models import TeamMember
    member = TeamMember.objects.filter(user=user).select_related('organization').first()
    if member:
        return member.organization
    org, _ = Organization.objects.get_or_create(
        owner=user,
        defaults={'name': f"{user.email}'s Organization"}
    )
    return org