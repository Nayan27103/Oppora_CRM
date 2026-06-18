import os
import sys
import json
import requests
from decouple import config

# Add the parent directory to sys.path so we can import django settings if needed,
# though this script runs standalone.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load keys from environment or .env
URLSCAN_API_KEY = config("URLSCAN_API_KEY", default=os.getenv("URLSCAN_API_KEY", ""))
THEIRSTACK_API_KEY = config("THEIRSTACK_API_KEY", default=os.getenv("THEIRSTACK_API_KEY", ""))

print("=" * 60)
print("             Oppora CRM - Technology APIs Checker")
print("=" * 60)
print(f"URLScan API Key:  {'Configured (masked)' if URLSCAN_API_KEY else 'Not configured (Optional for public searches)'}")
print(f"TheirStack API Key: {'Configured (masked)' if THEIRSTACK_API_KEY else 'Not configured (Required for TheirStack)'}")
print("=" * 60)

# Browser user agent to prevent Cloudflare/bot detection blocks on urlscan.io
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def check_urlscan_company_technologies(domain: str):
    """
    URLScan.io API Integration: Company (Domain) -> Technologies
    
    1. Search for recent scans matching the domain.
    2. Retrieve the UUID of the most recent scan.
    3. Retrieve the full scan details to extract Wappalyzer-detected technologies.
    """
    print(f"\n[URLScan.io] Checking technologies for domain: '{domain}'...")
    
    headers = DEFAULT_HEADERS.copy()
    if URLSCAN_API_KEY:
        headers["API-Key"] = URLSCAN_API_KEY

    # Step 1: Search for recent scans of this domain
    search_url = "https://urlscan.io/api/v1/search/"
    params = {
        "q": f"page.domain:{domain}",
        "size": 5
    }
    
    try:
        response = requests.get(search_url, params=params, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"[ERROR] URLScan Search failed with status code {response.status_code}: {response.text}")
            return
        
        search_data = response.json()
        results = search_data.get("results", [])
        
        if not results:
            print(f"[WARN] No recent scans found on URLScan.io for domain '{domain}'.")
            print("[INFO] You can run a new scan at urlscan.io, or use a domain with existing scans (e.g. 'stripe.com' or 'figma.com').")
            return
        
        print(f"[SUCCESS] Found {len(results)} historical scan(s). Retrieving technology profile from the latest scan...")
        latest_scan = results[0]
        uuid = latest_scan.get("_id")
        scan_time = latest_scan.get("task", {}).get("time", "Unknown time")
        scan_url = latest_scan.get("task", {}).get("url", domain)
        
        print(f"[INFO] Latest scan UUID: {uuid}")
        print(f"[INFO] Scan URL: {scan_url}")
        print(f"[INFO] Scan Time: {scan_time}")
        
        # Step 2: Fetch scan results to extract technologies
        result_url = f"https://urlscan.io/api/v1/result/{uuid}/"
        res_response = requests.get(result_url, headers=headers, timeout=15)
        
        if res_response.status_code != 200:
            print(f"[ERROR] Failed to fetch scan details for UUID {uuid}: Status {res_response.status_code}")
            return
            
        res_data = res_response.json()
        
        # Extract technologies from Wappalyzer metadata (under 'wappa' processor)
        processors = res_data.get("meta", {}).get("processors", {})
        wappa = processors.get("wappa", {})
        tech_list = wappa.get("data", [])
        
        if not tech_list:
            # Check lists.technologies fallback
            lists = res_data.get("lists", {})
            if "technologies" in lists:
                tech_list = [{"app": t, "categories": []} for t in lists.get("technologies", [])]
        
        if not tech_list:
            print("[WARN] No technologies detected in this scan by Wappalyzer.")
            return
            
        print(f"\n[INFO] Detected Technologies ({len(tech_list)}):")
        print("-" * 60)
        # Format the technologies
        for tech in tech_list:
            name = tech.get("app", "Unknown")
            
            # Categories can be a list of strings or a list of dictionaries
            raw_cats = tech.get("categories", [])
            categories_list = []
            for c in raw_cats:
                if isinstance(c, dict):
                    categories_list.append(c.get("name") or c.get("id") or str(c))
                else:
                    categories_list.append(str(c))
            
            categories = ", ".join(categories_list)
            version = tech.get("version", "")
            version_str = f" (v{version})" if version else ""
            cat_str = f" | Categories: {categories}" if categories else ""
            print(f" *  {name:<25}{cat_str}{version_str}")
        print("-" * 60)
        
    except Exception as e:
        print(f"[ERROR] Error communicating with URLScan.io API: {e}")


def check_theirstack_technology_companies(tech_name: str):
    """
    TheirStack API Integration: Technology -> Companies
    
    Queries TheirStack for a list of companies using the specified technology.
    """
    if not THEIRSTACK_API_KEY:
        print("\n[TheirStack] [ERROR] API Key is missing! Please configure 'THEIRSTACK_API_KEY' in your .env file or environment.")
        return
        
    # Standardize the slug (lowercase and strip spaces)
    tech_slug = tech_name.strip().lower()
    print(f"\n[TheirStack] Searching for companies using technology: '{tech_name}' (slug: '{tech_slug}')...")
    
    url = "https://api.theirstack.com/v1/companies/search"
    headers = {
        "Authorization": f"Bearer {THEIRSTACK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Request body structure: TheirStack filters are flat at the root level of the JSON body
    payload = {
        "page": 0,
        "limit": 10,
        "company_technology_slug_or": [tech_slug]
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code != 200:
            print(f"[ERROR] TheirStack search failed with status code {response.status_code}: {response.text}")
            return
            
        data = response.json()
        companies = data.get("companies", [])
        
        # If response structure wraps it differently, check for other keys
        if not companies and isinstance(data, list):
            companies = data
        elif not companies and isinstance(data, dict):
            # Try searching other common list keys
            for key in ["results", "data", "items"]:
                if key in data and isinstance(data[key], list):
                    companies = data[key]
                    break
        
        if not companies:
            print(f"[WARN] No companies found using technology '{tech_name}'.")
            return
            
        print(f"[SUCCESS] Found {len(companies)} matching companies:")
        print("-" * 75)
        print(f"{'Company Name':<25} | {'Domain':<20} | {'Industry':<15} | {'Location':<10}")
        print("-" * 75)
        
        for company in companies:
            name = company.get("name") or company.get("company_name") or "Unknown"
            domain = company.get("domain") or company.get("website") or "N/A"
            industry = company.get("industry") or "N/A"
            country = company.get("country") or company.get("location") or "N/A"
            
            print(f"{name[:24]:<25} | {domain[:19]:<20} | {industry[:14]:<15} | {country[:9]:<10}")
        print("-" * 75)
        
    except Exception as e:
        print(f"[ERROR] Error communicating with TheirStack API: {e}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Oppora CRM External Tech API Checker")
    parser.add_argument("--urlscan-domain", type=str, help="Domain to check technologies for on URLScan (e.g. stripe.com)")
    parser.add_argument("--theirstack-tech", type=str, help="Technology name to find companies for on TheirStack (e.g. react)")
    args = parser.parse_args()
    
    if args.urlscan_domain:
        check_urlscan_company_technologies(args.urlscan_domain)
    
    if args.theirstack_tech:
        check_theirstack_technology_companies(args.theirstack_tech)
        
    if not args.urlscan_domain and not args.theirstack_tech:
        print("\n[INFO] Usage examples:")
        print("  python scratch/check_tech_apis.py --urlscan-domain stripe.com")
        print("  python scratch/check_tech_apis.py --theirstack-tech react")
        print("\nLet's run a test query for URLScan with 'stripe.com':")
        check_urlscan_company_technologies("stripe.com")
        
        if THEIRSTACK_API_KEY:
            print("\nLet's run a test query for TheirStack with 'react':")
            check_theirstack_technology_companies("react")
        else:
            print("\n(Skipping TheirStack test query since no API key is configured.)")
