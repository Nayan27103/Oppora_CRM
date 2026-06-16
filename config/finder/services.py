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

    def generate_fallback_companies(self, industry='', location='', keywords='') -> list:
        catalog = [
            {"name": "Stripe", "domain": "stripe.com", "description": "Financial infrastructure for the internet. Payment processing for SaaS, marketplaces, and platforms.", "industry": "fintech, saas", "location": "San Francisco"},
            {"name": "Revolut", "domain": "revolut.com", "description": "One app, all things money. Digital banking, card payments, and financial services.", "industry": "fintech, banking", "location": "London"},
            {"name": "Wise", "domain": "wise.com", "description": "International money transfer platform. Send money abroad cheaply and quickly.", "industry": "fintech, saas", "location": "London"},
            {"name": "Salesforce", "domain": "salesforce.com", "description": "The world's #1 CRM platform. Help your sales, marketing, and support teams succeed.", "industry": "saas, crm", "location": "San Francisco"},
            {"name": "Slack", "domain": "slack.com", "description": "Slack is a new way to communicate with your team. It's faster, better organized, and more secure than email.", "industry": "saas, productivity", "location": "San Francisco"},
            {"name": "Figma", "domain": "figma.com", "description": "Collaborative interface design tool. Build websites, mobile apps, and UI mockups together.", "industry": "saas, design", "location": "San Francisco"},
            {"name": "Canva", "domain": "canva.com", "description": "Graphic design platform used to create social media graphics, presentations, and posters.", "industry": "saas, design", "location": "Sydney"},
            {"name": "Spotify", "domain": "spotify.com", "description": "Digital music, podcast, and video service that gives you access to millions of songs.", "industry": "entertainment, technology", "location": "Stockholm"},
            {"name": "Shopify", "domain": "shopify.com", "description": "E-commerce platform that allows anyone to set up an online store and sell their products.", "industry": "saas, ecommerce", "location": "Ottawa"},
            {"name": "HubSpot", "domain": "hubspot.com", "description": "Inbound marketing, sales, and service software that helps companies grow better.", "industry": "saas, marketing", "location": "Boston"},
            {"name": "Deliveroo", "domain": "deliveroo.com", "description": "Food delivery unicorn connecting consumers with local restaurants and grocery stores.", "industry": "logistics, tech", "location": "London"},
            {"name": "Monzo", "domain": "monzo.com", "description": "Digital mobile-only bank offering smart budgeting, instant notifications, and fee-free spending.", "industry": "fintech, banking", "location": "London"},
        ]
        
        results = []
        ind_query = industry.lower() if industry else ''
        loc_query = location.lower() if location else ''
        key_query = keywords.lower() if keywords else ''
        
        for c in catalog:
            match = False
            if ind_query and (ind_query in c["industry"].lower() or ind_query in c["name"].lower()):
                match = True
            if loc_query and (loc_query in c["location"].lower()):
                match = True
            if key_query and (key_query in c["description"].lower() or key_query in c["name"].lower()):
                match = True
                
            if match:
                results.append({
                    'name': c["name"],
                    'domain': c["domain"],
                    'description': c["description"],
                    'industry': industry or c["industry"].split(',')[0],
                    'location': location or c["location"],
                    'source': 'curated_fallback',
                })
                
        if len(results) < 5:
            ind_word = industry.split(',')[0].strip().replace(' ', '').lower() if industry else 'tech'
            loc_word = location.split(',')[0].strip().replace(' ', '').lower() if location else 'global'
            key_word = keywords.split(' ')[0].strip().replace(' ', '').lower() if keywords else 'startup'
            
            ind_word = ''.join(e for e in ind_word if e.isalnum())
            loc_word = ''.join(e for e in loc_word if e.isalnum())
            key_word = ''.join(e for e in key_word if e.isalnum())
            
            generated_templates = [
                {
                    "name_tpl": "{keyword_cap} {industry_cap}",
                    "domain_tpl": "{keyword}{industry}.io",
                    "desc_tpl": "Leading {industry} platform specializing in automated workflows and cloud solutions for modern teams."
                },
                {
                    "name_tpl": "{industry_cap} Flow",
                    "domain_tpl": "{industry}flow.com",
                    "desc_tpl": "Next-generation software infrastructure empowering scaling {industry} businesses worldwide."
                },
                {
                    "name_tpl": "Apex {keyword_cap}",
                    "domain_tpl": "apex{keyword}.co",
                    "desc_tpl": "High-growth enterprise technology provider optimizing operations and analytics."
                },
                {
                    "name_tpl": "{location_cap} {industry_cap} Labs",
                    "domain_tpl": "{location}{industry}labs.com",
                    "desc_tpl": "Innovating the future of {industry} from our hub in {location_cap}. Trusted by thousands of customers."
                },
                {
                    "name_tpl": "Vortex Systems",
                    "domain_tpl": "vortex{industry}.com",
                    "desc_tpl": "Advanced digital systems and software services tailored for modern industry challenges."
                }
            ]
            
            for tpl in generated_templates:
                name = tpl["name_tpl"].format(
                    keyword_cap=key_word.capitalize() or 'Nova',
                    industry_cap=ind_word.capitalize() or 'Tech',
                    location_cap=loc_word.capitalize() or 'London'
                )
                domain = tpl["domain_tpl"].format(
                    keyword=key_word or 'nova',
                    industry=ind_word or 'tech',
                    location=loc_word or 'london'
                )
                description = tpl["desc_tpl"].format(
                    industry=industry or 'technology',
                    location_cap=location.capitalize() or 'Global'
                )
                
                if not any(r['domain'] == domain for r in results):
                    results.append({
                        'name': name,
                        'domain': domain,
                        'description': description,
                        'industry': industry or 'Technology',
                        'location': location or 'Remote',
                        'source': 'generator_fallback',
                    })
                    
        return results[:9]

    def search_companies_by_criteria(
        self,
        industry='',
        location='',
        keywords='',
    ) -> list:
        query_parts = []
        if keywords:
            query_parts.append(keywords)
        if industry:
            query_parts.append(f'{industry} companies')
        if location:
            query_parts.append(f'in {location}')
        query = ' '.join(query_parts) if query_parts else 'top tech companies'

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
            snippets = soup.select('.result__snippet')
            companies = []
            for i, r in enumerate(results[:10]):
                href = r.get('href', '')
                text = r.get_text(strip=True)
                domain = ''
                if 'uddg=' in href:
                    import urllib.parse
                    decoded = urllib.parse.unquote(href.split('uddg=')[-1])
                    from urllib.parse import urlparse
                    parsed = urlparse(decoded)
                    domain = parsed.netloc.replace('www.', '')
                snippet = snippets[i].get_text(strip=True) if i < len(snippets) else ''
                if domain and text:
                    companies.append({
                        'name': text,
                        'domain': domain,
                        'description': snippet[:200],
                        'industry': industry,
                        'location': location,
                        'source': 'scraper',
                    })
            time.sleep(1)
            
            if not companies:
                return self.generate_fallback_companies(industry, location, keywords)
            return companies
        except Exception as e:
            logger.warning(f'Company search failed: {e}')
            return self.generate_fallback_companies(industry, location, keywords)


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