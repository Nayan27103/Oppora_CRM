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
        results_data = {
            'people': [],
            'company': {}
        }

        if query.domain:
            # ── People: Hunter (emails) + DDG/Serper scraper (names/titles) ──
            hunter_data    = hunter.search_by_domain(query.domain, limit=10)
            hunter_people  = hunter_data.get('people', [])

            scraped_people = scraper.search_people_duckduckgo(
                domain=query.domain,
                job_title=query.job_title,
            )

            all_people = merge_and_deduplicate(hunter_people, scraped_people)
            results_data['people'] = all_people

            # ── Company: AbstractAPI → scraper fallback ──
            if query.search_type in ('company', 'both'):
                company_data = enricher.enrich(query.domain)
                if company_data.get('name'):
                    results_data['company'] = company_data

        query.status            = 'done'
        query.results           = results_data
        query.contacts_imported = 0
        query.companies_imported = 0
        query.save(update_fields=['status', 'results', 'contacts_imported', 'companies_imported'])

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