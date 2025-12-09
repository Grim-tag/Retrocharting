
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
            
            # Strategy 1: CSS Selectors (Updated for 2024 Layout)
            # Vinted items usually have data-testid="grid-item"
            grid_items = soup.select('[data-testid="grid-item"]')
            
            if not grid_items:
                # Fallback: aggressive search for any link that looks like an item
                grid_items = soup.select('a[href^="/items/"]')
            
            seen_urls = set() # Initialize set before loop

            for item_node in grid_items:
                if len(items) >= limit:
                    break
                
                # If node is 'a', use it. If 'div', find 'a' inside.
                link = item_node if item_node.name == 'a' else item_node.select_one('a')
                if not link:
                    continue
                    
                url = link.get('href')
                if not url: continue
                
                full_url = url if url.startswith('http') else f"https://www.vinted.fr{url}"
                if full_url in seen_urls: continue

                # Title & Image
                img = item_node.select_one('img')
                image_url = img.get('src') if img else None
                title = img.get('alt') if img else "Vinted Item"
                
                # Price - look for specific currency symbols or patterns
                # Vinted prices often in a <p> or <span> with no clear class
                price_amount = 0.0
                price_text = ""
                for s in item_node.stripped_strings:
                    if '€' in s:
                        price_text = s
                        break
                
                try:
                    price_amount = float(price_text.replace('€', '').replace(',', '.').replace(' ', '').strip())
                except:
                    pass

                seen_urls.add(full_url)
                # Platform / Brand (often in a specific secondary slot)
                # Try to find a secondary meaningful text that is NOT the price or title
                platform_title = "Unknown"
                user_name = "Vinted User"
                
                # Basic text extraction strategy
                texts = list(item_node.stripped_strings)
                # content usually: [Image], "Brand", "Title", "Size", "Price", "size/brand"
                
                if len(texts) > 2:
                    # Heuristic: 2nd or 3rd item is often Brand/Platform
                    # But it varies. Let's just grab the one that isn't title or price logic.
                    pass

                # Fee Calculation (Standard Vinted: 0.70€ + 5%)
                protection_fee = 0.70 + (price_amount * 0.05)
                
                # Shipping: specific scraping is hard on grid, usually it's distinct.
                # We will set a default or try to parse if we see "+ X.XX €"
                shipping_amount = 0.0 # Unknown/To be confirmed
                
                seen_urls.add(full_url)
                items.append({
                    "id": random.randint(100000, 999999), 
                    "title": title,
                    "price": {"amount": price_amount, "currency_code": "EUR"},
                    "fee": {"amount": round(protection_fee, 2), "currency_code": "EUR"},
                    "shipping": {"amount": shipping_amount, "currency_code": "EUR"}, # Placeholder for now
                    "total_estimate": {"amount": round(price_amount + protection_fee + (2.99 if shipping_amount == 0 else shipping_amount), 2), "currency_code": "EUR"}, # 2.99 default shipping
                    "photo": {"url": image_url},
                    "url": full_url,
                    "platform": "Vinted", # The source platform
                    "brand": "N/A", # TODO: Better scraping
                    "created_at_ts": "Just now",
                    "_all_texts": texts # DEBUG
                })

            # Relevancy Filter
            # Since scraping might pick up Promoted/Recommended items not relevant to query
            filtered_items = []
            query_words = [w.lower() for w in query.split() if len(w) > 2] # Ignore small words
            
            for item in items:
                title_lower = item['title'].lower()
                # Pass if strict match of at least one significant word, 
                # OR if query has no significant words (weird edge case)
                if not query_words or any(w in title_lower for w in query_words):
                     filtered_items.append(item)
            
            if filtered_items:
                return {"items": filtered_items, "debug": debug_info}
            
            # If we filtered everything, maybe return raw items but warn?
            # Or just return empty. Let's return raw for now if filter is too aggressive? 
            # No, user complained about irrelevant items. Better empty than noise.
            
            # Strategy 2: JSON Extraction (Backup)
            # Try to find script with data-js-react-on-rails-store="MainStore"
            # This is complex to parse safely without exact structure knowledge, 
            # but usually it's a big JSON blob.
            
            return {
                "items": [], 
                "debug": {
                    "error": f"No items found. HTML Preview: {html_content[:200]}...",
                    "html_preview": html_content[:500]
                }
            }
            
        except Exception as e:
            print(f"Vinted/ZenRows Fatal Error: {e}")
            import traceback
            traceback.print_exc()
            return {"items": [], "debug": {"error": str(e), "trace": traceback.format_exc()}}

vinted_client = VintedClient()
