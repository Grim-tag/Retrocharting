import requests
from app.core.config import settings

class AmazonClient:
    def __init__(self):
        self.api_key = settings.SERPAPI_KEY
        self.base_url = "https://serpapi.com/search"
        self.associate_tag = "retrocharting-21"

    def search_items(self, query: str, limit: int = 5, domain: str = "amazon.fr"):
        """
        Search Amazon products using SerpApi.
        Returns a list of simplified items.
        """
        if not self.api_key:
            print("Warning: SERPAPI_KEY not set. Skipping Amazon search.")
            return []

        params = {
            "engine": "google_shopping", # Using Google Shopping as it's often cheaper/cleaner API-wise or actually Amazon?
            # User asked for Amazon. SerpApi "Amazon" engine exists.
            # Let's use "amazon" engine.
            # ERROR FIX: Amazon engine uses 'k' or 'q'? 
            # Error said: Missing query `k` or `node`. So it wants `k`.
            "engine": "amazon",
            "k": query, # Amazon search query
            "api_key": self.api_key,
            "type": "search",
            "amazon_domain": domain, 
            "num": limit
        }

        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            data = response.json()
            
            if "error" in data:
                print(f"Amazon Search Error: {data['error']}")
                return []
                
            results = []
            
            # different keys based on engine?
            # Amazon SerpApi results usually in 'organic_results'
            items = data.get("organic_results", [])
            
            for item in items:
                # Basic fields
                title = item.get("title")
                price_val = 0.0
                currency = "EUR"
                
                # SerpApi 'amazon' engine: price is usually in 'price' (float) or 'extracted_price'
                # or 'price' object { "value": 12.99, "currency": "EUR" } ?
                # Actually commonly: 'price': 14.99 
                # Check for various keys
                raw_price = item.get("price")
                if isinstance(raw_price, (int, float)):
                    price_val = float(raw_price)
                elif isinstance(raw_price, str):
                    # "12,99 €" -> 12.99
                    try:
                        clean = raw_price.replace("€", "").replace(",", ".").strip()
                        price_val = float(clean)
                    except:
                         pass
                
                # Fallback to extracted_price if available
                if price_val == 0.0 and "extracted_price" in item:
                     try:
                         price_val = float(item["extracted_price"])
                     except:
                         pass
                
                if price_val == 0.0:
                    continue # Skip items without price

                # URL with Affiliation
                link = item.get("link")
                if link:
                    if "?" in link:
                        link += f"&tag={self.associate_tag}"
                    else:
                        link += f"?tag={self.associate_tag}"
                
                # Image
                thumb = item.get("thumbnail")
                        
                results.append({
                    "title": title,
                    "price": price_val,
                    "currency": currency,
                    "image": thumb,
                    "link": link,
                    "asin": item.get("asin"),
                    "source": "Amazon",
                    "condition": "New" # Amazon is usually new unless 'renewed' is in title
                })
                
            return results

        except Exception as e:
            print(f"Amazon Client Error: {e}")
            return []

    def search_product_smart(self, product):
        """
        Smart search strategy:
        1. If ASIN exists -> Search by ASIN (Precise).
        2. Else -> Search by Title + Console (Fuzzy Fallback).
        """
        if hasattr(product, 'asin') and product.asin:
            # Search by ASIN is extremely precise
            # checks both 'asin' field and standard search with ASIN kw
            print(f"Amazon Smart Search: Using ASIN {product.asin}")
            results = self.search_items(product.asin, limit=1)
            # If ASIN search yields result, trustworthy.
            if results: return results

        # Fallback to Text Search
        query = f"{product.product_name} {product.console_name}"
        # Filter out 'PAL' or region tags if needed for cleaner search?
        # For now, keep full name
        print(f"Amazon Smart Search: Fallback to name '{query}'")
        return self.search_items(query, limit=5)

amazon_client = AmazonClient()
