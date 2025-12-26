import requests
import random
import time
from bs4 import BeautifulSoup
from typing import Optional, Dict, Any

class AmazonScraper:
    """
    Scrapes Amazon product pages without using an API.
    Implements basic anti-detection measures (User-Agents, headers).
    """
    
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    ]

    def __init__(self):
        self.session = requests.Session()

    def _get_headers(self, domain: str) -> Dict[str, str]:
        """Generate realistic headers for the specific domain."""
        ua = random.choice(self.USER_AGENTS)
        return {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5" if "com" in domain else "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": f"https://www.{domain}/",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
        }

    def search_product(self, query: str, domain: str = "amazon.fr") -> Optional[Dict[str, Any]]:
        """
        Searches for a product on the specified Amazon domain.
        Returns the first relevant result.
        """
        base_url = f"https://www.{domain}/s"
        params = {"k": query}
        headers = self._get_headers(domain)

        try:
            print(f"[{domain}] Searching for: {query}")
            response = self.session.get(base_url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 503:
                print(f"[{domain}] 503 Detected (Bot Check). Skipping.")
                return None
                
            if response.status_code != 200:
                print(f"[{domain}] Failed with status {response.status_code}")
                return None

            soup = BeautifulSoup(response.content, "html.parser")
            
            # Select search results
            # Amazon CSS classes change, but 's-result-item' is fairly stable
            results = soup.select("div.s-result-item[data-component-type='s-search-result']")
            
            for item in results[:3]: # Check top 3 results
                parsed = self._parse_item(item, domain)
                if parsed and parsed.get('price'):
                    return parsed
                    
            return None

        except Exception as e:
            print(f"[{domain}] Error searching: {e}")
            return None

    # Affiliate Tags Configuration
    # You should update these with your specific IDs per region if you have them.
    # Amazon OneLink may allow using one ID (e.g. US) that redirects, but direct IDs are safer.
    AFFILIATE_TAGS = {
        "amazon.fr": "retrocharting-21",
        "amazon.de": "retrocharting-21", # Often same for EU
        "amazon.it": "retrocharting-21",
        "amazon.es": "retrocharting-21",
        "amazon.co.uk": "retrocharting-21", # Verify this
        "amazon.com": "retrocharting-20", # Placeholder for US
        "amazon.ca": "retrocharting-20",
        "amazon.co.jp": "retrocharting-22", # Placeholder for JP
        # Default fallback
        "default": "retrocharting-21"
    }

    def _parse_item(self, item: BeautifulSoup, domain: str) -> Optional[Dict[str, Any]]:
        """Parses a single search result item."""
        try:
            # Title with Fallbacks
            title_el = item.select_one("h2 a span") or item.select_one("h2 span") or item.select_one("h2")
            if not title_el: return None
            title = title_el.get_text(strip=True)

            # ASIN
            asin = item.get("data-asin")
            if not asin: return None

            # Price
            price_whole = item.select_one(".a-price-whole")
            price_fraction = item.select_one(".a-price-fraction")
            
            price = 0.0
            if price_whole:
                # Remove punctuation (differs by locale, e.g. "1.200" vs "1,200")
                # Simple integer parse for safety first
                w = price_whole.get_text(strip=True).replace(".", "").replace(",", "")
                f = "00"
                if price_fraction:
                    f = price_fraction.get_text(strip=True)
                
                try:
                    price = float(f"{w}.{f}")
                except:
                    pass
            
            # Currency map
            currency_map = {
                "amazon.fr": "EUR", "amazon.de": "EUR", "amazon.it": "EUR", "amazon.es": "EUR",
                "amazon.co.uk": "GBP", "amazon.com": "USD", "amazon.co.jp": "JPY",
                "amazon.nl": "EUR", "amazon.se": "SEK", "amazon.pl": "PLN"
            }
            currency = currency_map.get(domain, "EUR")

            # Link with Dynamic Affiliate Tag
            tag = self.AFFILIATE_TAGS.get(domain, self.AFFILIATE_TAGS["default"])
            link = f"https://www.{domain}/dp/{asin}?tag={tag}"

            # Image
            img_el = item.select_one("img.s-image")
            image_url = img_el.get("src") if img_el else None

            return {
                "title": title,
                "price": price,
                "currency": currency,
                "asin": asin,
                "url": link,
                "image_url": image_url,
                "source": "Amazon",
                "seller_name": f"Amazon ({domain})"
            }
        except Exception as e:
            # print(f"Parse error: {e}")
            return None

    def get_product_details(self, url: str, domain: str = "amazon.fr") -> Optional[Dict[str, Any]]:
        """
        Visits the product detail page to extract more data (EAN, UPC, Description).
        """
        headers = self._get_headers(domain)
        try:
            time.sleep(random.uniform(1.0, 3.0)) # Polite delay
            response = self.session.get(url, headers=headers, timeout=12)
            
            if response.status_code != 200:
                print(f"[{domain}] Details fetch failed: {response.status_code}")
                return None
                
            soup = BeautifulSoup(response.content, "html.parser")
            
            details = {}
            
            # 1. Technical Details Table (prodDetails)
            # Look for th/td pairs
            tables = soup.select("table.a-keyvalue, table#productDetails_techSpec_section_1")
            for table in tables:
                rows = table.select("tr")
                for row in rows:
                    th = row.select_one("th")
                    td = row.select_one("td")
                    if th and td:
                        key = th.get_text(strip=True).lower()
                        val = td.get_text(strip=True)
                        
                        if "ean" in key or "upc" in key or "barcode" in key:
                             # Clean value (remove invisible chars)
                             val = "".join([c for c in val if c.isdigit()])
                             if len(val) >= 8: # Min length for EAN/UPC
                                 details['ean'] = val
                        
                        if "asin" in key:
                            details['asin'] = val

            # 2. Description (if needed)
            desc_el = soup.select_one("#productDescription")
            if desc_el:
                details['description'] = desc_el.get_text("\n", strip=True)

            return details

        except Exception as e:
            print(f"Error fetching details: {e}")
            return None
