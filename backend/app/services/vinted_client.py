
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

                # Platform / Brand Extraction
                # Strategy:
                # 1. Look for specific data-testid="item-attributes-video_game_platform-link" (User suggestion)
                # 2. Look for "marque:" in img alt text.
                # 3. Scan Title and other texts for Known Console Keywords.
                
                platform_title = "Vinted" # Default
                
                # 1. Try specific selector (Rare in Grid, but possible)
                platform_node = item_node.select_one('[data-testid$="video_game_platform-link"]')
                if platform_node:
                    platform_title = platform_node.get_text(strip=True)
                
                # 2. Heuristic: Parse 'marque:' from alt text or text nodes
                # Example alt: "... marque: PlayStation, état: Bon état ..."
                if platform_title == "Vinted":
                    alt_text = img.get('alt', '') if img else ""
                    if "marque:" in alt_text.lower():
                        try:
                            # Extract text after "marque:" up to next comma or end
                            start = alt_text.lower().find("marque:") + 7
                            rest = alt_text[start:]
                            end = rest.find(",")
                            if end == -1: end = len(rest)
                            candidate = rest[:end].strip()
                            if candidate:
                                platform_title = candidate
                        except:
                            pass

                # 3. Keyword Scanning in Title (Strong Fallback for Games)
                # If we haven't found a platform yet, or if it's generic "Vinted"
                if platform_title == "Vinted":
                    known_platforms = {
                        "Nintendo Switch": ["switch"],
                        "PlayStation 5": ["ps5", "playstation 5"],
                        "PlayStation 4": ["ps4", "playstation 4"],
                        "PlayStation 3": ["ps3", "playstation 3"],
                        "PlayStation 2": ["ps2", "playstation 2"],
                        "PlayStation 1": ["ps1", "psx", "playstation 1", "playstation one"],
                        "PSP": ["psp", "playstation portable"],
                        "PS Vita": ["vita", "ps vita"],
                        "Nintendo Wii U": ["wii u"],
                        "Nintendo Wii": ["wii"],
                        "Nintendo 3DS": ["3ds"],
                        "Nintendo DS": ["ds", "nintendo ds"],
                        "GameCube": ["gamecube", "ngc"],
                        "Nintendo 64": ["n64", "nintendo 64"],
                        "SNES": ["snes", "super nintendo"],
                        "NES": ["nes", "nintendo entertainment system"],
                        "Game Boy": ["game boy", "gameboy", "gba", "gbc"],
                        "Xbox Series": ["xbox series", "series x", "series s"],
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
