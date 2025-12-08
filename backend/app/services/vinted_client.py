
import requests
import random
import time
import urllib.parse

class VintedClient:
    ZENROWS_API_KEY = "d4e9a47779876433a451ed50a536670d97e56182"
    ZENROWS_URL = "https://api.zenrows.com/v1/"

import requests
import random
import time
import urllib.parse
import json
from bs4 import BeautifulSoup

class VintedClient:
    ZENROWS_API_KEY = "d4e9a47779876433a451ed50a536670d97e56182"
    ZENROWS_URL = "https://api.zenrows.com/v1/"
    VINTED_WEB_URL = "https://www.vinted.fr/catalog"

    def search(self, query: str, limit: int = 20):
        """
        Searches for items on Vinted by scraping the catalog page via ZenRows.
        """
        debug_info = {"status": "unknown", "provider": "ZenRows Scraper"}

        # Construct target Vinted Web URL
        vinted_params = {
            "search_text": query,
            "order": "newest_first",
        }
        encoded_params = urllib.parse.urlencode(vinted_params)
        target_url = f"{self.VINTED_WEB_URL}?{encoded_params}"

        # ZenRows Params
        params = {
            "apikey": self.ZENROWS_API_KEY,
            "url": target_url,
            "js_render": "true",
            "premium_proxy": "true", 
            "antibot": "true",
        }
        
        try:
            print(f"Calling ZenRows (Web Scrape) for: {target_url}")
            # Increase timeout for full page render
            response = requests.get(self.ZENROWS_URL, params=params, timeout=60)
            
            debug_info["http_code"] = response.status_code
            
            if response.status_code != 200:
                print(f"ZenRows Error: {response.text}")
                return {
                    "items": [], 
                    "debug": {
                        "error": f"ZenRows {response.status_code}: {response.text}", 
                        "http_code": response.status_code
                    }
                }

            # Parse HTML
            html_content = response.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            items = []
            
            # Strategy 1: Look for the JSON data embedded in the page (most reliable)
            # Vinted often stores state in a script tag with data-js-react-on-rails-store="MainStore"
            # or similar.
            # Let's try to find product items in the grid first through DOM as it's more stable across versions often.
            
            # DOM Strategy:
            # We look for links that look like item links "/items/..."
            product_links = soup.select('a[href^="/items/"]')
            
            # Deduplicate by URL
            seen_urls = set()
            
            for link in product_links:
                if len(items) >= limit:
                    break
                    
                url = link.get('href')
                if not url or url in seen_urls:
                    continue
                
                # Check if it has a title (often in nested img alt or div)
                # Structure varies. Let's try to extract what we can.
                # Often the link contains the image and info.
                
                # Try to find parent wrapper for better context if needed, but link usually wraps the tile.
                # Extract Title
                title = "Unknown Item" 
                user_box = link.select_one('[class*="UserBox_container"]')
                if user_box:
                     # This is a user profile link, skip
                     continue

                # Find Image
                img = link.select_one('img')
                image_url = img.get('src') if img else None
                title = img.get('alt') if img else "Vinted Item"
                
                # Find Price
                # Price is usually in a div with some class, often with currency symbol
                # For simplicity in this raw scrape, we might miss price if class obfuscated.
                # Let's try finding text starting with € or ending with €
                price_texts = [s for s in link.stripped_strings if '€' in s]
                price_raw = price_texts[0] if price_texts else "0.00 €"
                
                # Clean price
                try:
                    price_amount = float(price_raw.replace('€', '').replace(',', '.').strip())
                except:
                    price_amount = 0.0
                
                full_url = url if url.startswith('http') else f"https://www.vinted.fr{url}"
                
                seen_urls.add(url)
                items.append({
                    "id": random.randint(100000, 999999), # Fake ID as we don't have it easily
                    "title": title,
                    "price": {"amount": price_amount, "currency_code": "EUR"},
                    "photo": {"url": image_url},
                    "url": full_url,
                    "created_at_ts": "Just now" # Scraped live
                })
            
            # Verification: If DOM worked, return.
            if items:
                return {"items": items, "debug": debug_info}
                
            # Strategy 2: Fallback to JSON extraction if DOM failed (Vinted changes classes often)
            # This is harder to implement "blindly" without seeing the source code.
            # Let's trust DOM for now but add a specific error if empty.
            
            return {
                "items": [], 
                "debug": {
                    "error": "No items found in HTML. Selectors might be outdated.",
                    "html_preview": html_content[:500]
                }
            }
            
        except Exception as e:
            print(f"Vinted/ZenRows Fatal Error: {e}")
            import traceback
            traceback.print_exc()
            return {"items": [], "debug": {"error": str(e), "trace": traceback.format_exc()}}

vinted_client = VintedClient()
