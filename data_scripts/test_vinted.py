
import requests
import json
import time
import random

def test_vinted_api():
    print("Testing Vinted API access...")
    
    session = requests.Session()
    
    # 1. Get Cookies (Session + CSRF)
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    headers = {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    try:
        print("1. Fetching Homepage (Cookies)...")
        resp_home = session.get("https://www.vinted.fr/", headers=headers, timeout=10)
        resp_home.raise_for_status()
        
        # Check cookies
        cookies = session.cookies.get_dict()
        print(f"Cookies acquired: {list(cookies.keys())}")
        if 'access_token_web' not in cookies and '_vinted_fr_session' not in cookies:
             print("Warning: Vital cookies might be missing.")
        
        # 2. Query API
        # search_text = "Nintendo 64"
        # catalog_id = 907 (Video Games) or 228 (Consoles)? 
        # API: https://www.vinted.fr/api/v2/catalog/items?search_text=Nintendo+64&order=newest_first&per_page=5
        
        print("2. Querying Catalog API...")
        api_url = "https://www.vinted.fr/api/v2/catalog/items"
        params = {
            "search_text": "Super Mario 64",
            "order": "newest_first",
            "per_page": 5,
            # "catalog_ids": 228 # Optional
        }
        
        # Update headers for API
        headers["Accept"] = "application/json, text/plain, */*"
        headers["X-Requested-With"] = "XMLHttpRequest" # Often required
        
        # Sleep to mimic human behavior
        time.sleep(random.uniform(1, 2))
        
        resp_api = session.get(api_url, headers=headers, params=params, timeout=10)
        
        if resp_api.status_code == 200:
            data = resp_api.json()
            items = data.get('items', [])
            print(f"Success! Found {len(items)} items.")
            
            for item in items:
                title = item.get('title')
                price = item.get('price', {}).get('amount', 'N/A')
                currency = item.get('price', {}).get('currency_code', 'EUR')
                url = item.get('url')
                created = item.get('created_at_ts') # timestamp
                photo = item.get('photo', {}).get('url')
                
                # Convert date
                date_str = "Unknown"
                if created:
                    import datetime
                    date_str = datetime.datetime.fromtimestamp(created).strftime('%Y-%m-%d %H:%M:%S')
                
                print(f"[VINTED] {date_str} - {title} : {price} {currency}")
                print(f"         Link: {url}")
                
        elif resp_api.status_code == 401:
             print("Error 401: Unauthorized. Cookie strategy failed.")
        elif resp_api.status_code == 403:
             print("Error 403: Bot detected (Cloudflare/Datadome).")
        else:
             print(f"Error {resp_api.status_code}: {resp_api.text[:200]}")
             
    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    test_vinted_api()
