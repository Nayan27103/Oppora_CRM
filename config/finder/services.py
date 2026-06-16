import requests
from bs4 import BeautifulSoup
from decouple import config
import logging
import time

logger = logging.getLogger(__name__)

HUNTER_API_KEY   = config('HUNTER_API_KEY', default='')
ABSTRACT_API_KEY = config('ABSTRACT_API_KEY', default='')


# ── 1. Hunter.io — people + emails by domain ──────────────────────────────

class HunterService:
    """
    Hunter.io free plan: 25 domain searches/month
    Signup: https://hunter.io/users/sign_up
    """
    BASE_URL = 'https://api.hunter.io/v2'

    def search_by_domain(self, domain: str, limit: int = 10) -> dict:
        try:
            resp = requests.get(
                f'{self.BASE_URL}/domain-search',
                params={
                    'domain': domain,
                    'limit': limit,
                    'api_key': HUNTER_API_KEY,
                },
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json().get('data', {})
            people = []
            for e in data.get('emails', []):
                people.append({
                    'first_name': e.get('first_name', ''),
                    'last_name':  e.get('last_name', ''),
                    'email':      e.get('value', ''),
                    'job_title':  e.get('position', ''),
                    'company':    data.get('organization', ''),
                    'domain':     domain,
                    'source':     'hunter',
                })
            return {
                'people': people,
                'organization': data.get('organization', ''),
                'domain': domain,
            }
        except requests.RequestException as e:
            logger.error(f'Hunter error for {domain}: {e}')
            return {'people': [], 'organization': '', 'domain': domain}


# ── 2. AbstractAPI — company enrichment by domain ─────────────────────────

class AbstractAPIService:
    """
    AbstractAPI Company Enrichment — truly free tier
    Free: 20 requests/month, no credit card needed
    Signup: https://app.abstractapi.com/users/signup  (any email works)
    API key: https://app.abstractapi.com/api/company-enrichment/tester
    Returns: name, industry, employee count, location, description
    """
    BASE_URL = 'https://companyenrichment.abstractapi.com/v2/'

    def enrich_company(self, domain: str) -> dict:
        if not ABSTRACT_API_KEY:
            logger.warning('AbstractAPI key not set — skipping company enrichment.')
            return {}
        try:
            resp = requests.get(
                self.BASE_URL,
                params={
                    'api_key': ABSTRACT_API_KEY,
                    'domain': domain,
                },
                timeout=10
            )
            if resp.status_code == 429:
                logger.warning('AbstractAPI rate limit hit.')
                return {}
            if resp.status_code == 404:
                return {}
            resp.raise_for_status()
            data = resp.json()
            return {
                'name':           data.get('company_name', ''),
                'domain':         domain,
                'industry':       data.get('industry', ''),
                'location':       data.get('city', '') + ', ' + data.get('country', ''),
                'employee_count': data.get('employees_count', 0),
                'description':    data.get('description', ''),
                'linkedin':       data.get('linkedin_url', ''),
                'source':         'abstractapi',
            }
        except requests.RequestException as e:
            logger.error(f'AbstractAPI error for {domain}: {e}')
            return {}


# ── 3. DuckDuckGo scraper — zero signup, zero limits ─────────────────────

class WebScraperService:
    """
    Scrapes DuckDuckGo Instant Answer + company homepage as a fallback.
    No API key, no account, no rate limits enforced externally.
    Use only when AbstractAPI returns nothing.
    Add a small delay between calls to be polite.
    """
    HEADERS = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        )
    }

    def get_company_info_from_homepage(self, domain: str) -> dict:
        """
        Visits the company homepage and extracts:
        - Page title (usually company name)
        - Meta description (usually a 1-line company description)
        """
        try:
            url = f'https://{domain}'
            resp = requests.get(url, headers=self.HEADERS, timeout=8)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Company name — from og:site_name or title tag
            og_name = soup.find('meta', property='og:site_name')
            name = og_name['content'].strip() if og_name and og_name.get('content') else ''
            if not name:
                title_tag = soup.find('title')
                name = title_tag.get_text().split('|')[0].split('-')[0].strip() if title_tag else ''

            # Description — from meta description or og:description
            og_desc = soup.find('meta', property='og:description')
            description = og_desc['content'].strip() if og_desc and og_desc.get('content') else ''
            if not description:
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                description = meta_desc['content'].strip() if meta_desc and meta_desc.get('content') else ''

            return {
                'name':        name,
                'domain':      domain,
                'description': description[:300],
                'industry':    '',
                'location':    '',
                'source':      'scraper',
            }
        except Exception as e:
            logger.warning(f'Scraper failed for {domain}: {e}')
            return {}

    def search_people_duckduckgo(self, domain: str, job_title: str = '') -> list:
        """
        Searches DuckDuckGo for people at a company.
        Query: 'site:linkedin.com/in <job_title> <company domain>'
        Returns basic name + title info (no email — use Hunter for that).
        """
        query = f'site:linkedin.com/in "{job_title}" "{domain}"' if job_title else f'site:linkedin.com/in "{domain}"'
        try:
            resp = requests.get(
                'https://html.duckduckgo.com/html/',
                params={'q': query},
                headers=self.HEADERS,
                timeout=10
            )
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')
            results = soup.select('.result__title a')
            people = []
            for r in results[:10]:
                text = r.get_text(strip=True)
                # LinkedIn result titles look like: "John Doe - Software Engineer at Stripe"
                if ' - ' in text:
                    parts = text.split(' - ', 1)
                    name_part = parts[0].strip()
                    role_part = parts[1].strip() if len(parts) > 1 else ''
                    names = name_part.split(' ', 1)
                    people.append({
                        'first_name': names[0] if names else '',
                        'last_name':  names[1] if len(names) > 1 else '',
                        'email':      '',
                        'job_title':  role_part.split(' at ')[0].strip() if ' at ' in role_part else role_part,
                        'company':    domain,
                        'domain':     domain,
                        'source':     'scraper',
                    })
            time.sleep(1)   # be polite to DDG
            return people
        except Exception as e:
            logger.warning(f'DDG scrape failed for {domain}: {e}')
            return []


# ── 4. Orchestrator — tries AbstractAPI first, falls back to scraper ──────

class CompanyEnrichmentOrchestrator:
    """
    Tries AbstractAPI first (best data quality).
    Falls back to homepage scraper if AbstractAPI returns nothing
    or if no API key is configured.
    """
    def __init__(self):
        self.abstract = AbstractAPIService()
        self.scraper  = WebScraperService()

    def enrich(self, domain: str) -> dict:
        result = self.abstract.enrich_company(domain)
        if result.get('name'):
            return result
        logger.info(f'AbstractAPI returned nothing for {domain}, trying scraper...')
        return self.scraper.get_company_info_from_homepage(domain)


# ── 5. Merge helper ───────────────────────────────────────────────────────

def merge_and_deduplicate(hunter_people: list, extra_people: list) -> list:
    """
    Merge Hunter + any other source.
    Deduplicate by email first, then by first+last+company.
    Hunter records take priority (verified emails).
    """
    seen_emails = {}
    seen_names  = set()
    result      = []

    for person in hunter_people + extra_people:
        email = (person.get('email') or '').lower().strip()
        if email:
            if email not in seen_emails:
                seen_emails[email] = person
                result.append(person)
        else:
            key = (
                person.get('first_name', '').lower(),
                person.get('last_name', '').lower(),
                person.get('company', '').lower(),
            )
            if key not in seen_names and any(key):
                seen_names.add(key)
                result.append(person)

    return result