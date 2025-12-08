
import requests
import time
import random
from typing import List, Dict, Any, Optional

class VintedClient:
    BASE_URL = "https://www.vinted.fr"
    API_URL = "https://www.vinted.fr/api/v2/catalog/items"
    
    def __init__(self):
        self.session = requests.Session()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "X-Requested-With": "XMLHttpRequest" 
        }
        self.last_cookie_refresh = 0
        self.cookie_refresh_interval = 600 # 10 minutes

    def _refresh_cookies(self):
        """Fetches the homepage to refresh session cookies."""
        try:
            # Standard browser headers for the page load
            page_headers = self.headers.copy()
            page_headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            del page_headers["X-Requested-With"]

            print(f"Refreshing Vinted cookies...")
            resp = self.session.get(self.BASE_URL, headers=page_headers, timeout=10)
            resp.raise_for_status()
            
            self.last_cookie_refresh = time.time()
            return True
        except Exception as e:
            print(f"Failed to refresh Vinted cookies: {e}")
            return False

    def search(self, query: str, limit: int = 20):
        """
        Searches for items on Vinted.
        Returns: Dict with 'items' (list) and 'debug' (dict with status/error).
        """
        debug_info = {"status": "unknown"}
        
        # Ensure cookies are fresh
        if time.time() - self.last_cookie_refresh > self.cookie_refresh_interval or not self.session.cookies:
            if not self._refresh_cookies():
                print("Aborting search due to cookie failure.")
                return {"items": [], "debug": {"error": "Cookie fetch failed", "status": "cookie_error"}}

        params = {
            "search_text": query,
            "order": "newest_first",
            "per_page": limit,
        }
        
        try:
            # Human jitter
            time.sleep(random.uniform(0.5, 1.5))
            
            response = self.session.get(self.API_URL, headers=self.headers, params=params, timeout=10)
            debug_info["http_code"] = response.status_code
            
            if response.status_code == 401:
                print("Vinted 401 Unauthorized. Retrying cookie refresh...")
                self._refresh_cookies()
                response = self.session.get(self.API_URL, headers=self.headers, params=params, timeout=10)
                debug_info["retry_http_code"] = response.status_code

            response.raise_for_status()
            data = response.json()
            return {"items": data.get("items", []), "debug": debug_info}
            
        except Exception as e:
            print(f"Vinted Search Error: {e}")
            import traceback
            traceback.print_exc()
            return {"items": [], "debug": {"error": str(e), "http_code": debug_info.get("http_code"), "trace": traceback.format_exc()}}

vinted_client = VintedClient()
