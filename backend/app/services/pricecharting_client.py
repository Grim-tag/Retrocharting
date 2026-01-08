
import requests
from typing import Optional, Dict, Any
from app.core.config import settings
import urllib.parse

class PriceChartingClient:
    BASE_URL = "https://www.pricecharting.com/api/product"
    SEARCH_URL = "https://www.pricecharting.com/api/products"
    
    def __init__(self):
        self.token = settings.PRICECHARTING_API_TOKEN
        if not self.token:
            print("WARNING: PRICECHARTING_API_TOKEN is not set.")

    def get_product(self, pc_id: str) -> Optional[Dict[str, Any]]:
        """
        Get full product details by PriceCharting ID.
        Includes current prices for: loose, cib, new, box-only, manual-only.
        """
        if not self.token: return None
        
        params = {
            "t": self.token,
            "id": pc_id
        }
        try:
            resp = requests.get(self.BASE_URL, params=params, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"PriceCharting API Error (get_product): {e}")
            return None

    def search_product(self, query: str) -> Optional[str]:
        """
        Search for a product ID by name.
        Returns the ID of the first match or None.
        """
        if not self.token: return None
        
        params = {
            "t": self.token,
            "q": query
        }
        try:
            resp = requests.get(self.SEARCH_URL, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            if data and isinstance(data, list) and len(data) > 0:
                # Return the ID of the first result
                # API format: [{"id": "1234", "product-name": "...", ...}]
                return data[0].get("id")
            return None
        except Exception as e:
            print(f"PriceCharting API Error (search_product): {e}")
            return None

pricecharting_client = PriceChartingClient()
