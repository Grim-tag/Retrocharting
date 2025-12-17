import requests
import base64
from app.core.config import settings
from typing import List, Optional, Dict, Any

class EbayClient:
    BASE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
    OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
    
    # Add field filters to request GTIN explicitly if possible, though 'fieldgroups' param is limited in browse API
    # We rely on default response containing 'gtin' or 'epid'
    
    def __init__(self):
        self.client_id = settings.EBAY_CLIENT_ID
        self.client_secret = settings.EBAY_CLIENT_SECRET
        self.token = None
        
    def get_access_token(self) -> str:
        """Get a fresh Application Access Token via Client Credentials Grant"""
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "client_credentials",
            "scope": "https://api.ebay.com/oauth/api_scope" 
        }
        
        try:
            response = requests.post(self.OAUTH_URL, headers=headers, data=data)
            response.raise_for_status()
            self.token = response.json().get("access_token")
            return self.token
        except Exception as e:
            print(f"Failed to get eBay Access Token: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return None

    NEGATIVE_KEYWORDS_STRICT = ['repro', 'reproduction', 'mod', 'modded', 'fake', 'copie']
    
    def _filter_results(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Hard filter to remove absolute junk before it even reaches the classifier.
        """
        clean_items = []
        for item in items:
            title = item.get('title', '').lower()
            if any(keyword in title for keyword in self.NEGATIVE_KEYWORDS_STRICT):
                continue
            
            # Extract GTIN/EAN/UPC if available in 'additionalImages' or top level? 
            # eBay JSON structure varies. Usually 'gtin' is top level in itemSummary
            # Ensure we keep these fields
            clean_items.append(item)
        return clean_items

    def search_items(self, query: str, limit: int = 10, condition: Optional[str] = None, category_ids: Optional[str] = None, marketplace_id: str = "EBAY_FR") -> List[Dict[str, Any]]:
        """
        Search for items on eBay.
        """
        if not self.token:
            if not self.get_access_token():
                return []
                
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "X-EBAY-C-MARKETPLACE-ID": marketplace_id
        }
        
        params = {
            "q": query,
            "limit": limit,
            "sort": "price", 
            "filter": "buyingOptions:{FIXED_PRICE}" 
        }
        
        if category_ids:
            params["category_ids"] = category_ids
        
        if condition:
            if condition.lower() == "new":
                params["filter"] += ",conditionIds:{1000}"
            elif condition.lower() == "cib":
                params["filter"] += ",conditionIds:{3000}" 
            elif condition.lower() == "loose":
                params["filter"] += ",conditionIds:{3000}"
                
        # If no explicit category, try to default to Video Games (139973) if query looks like a game?
        # No, let caller handle categories.

        try:
            response = requests.get(self.BASE_URL, headers=headers, params=params)
            
            # If 401, token might be expired, retry once
            if response.status_code == 401:
                print("Token expired, refreshing...")
                if self.get_access_token():
                    headers["Authorization"] = f"Bearer {self.token}"
                    response = requests.get(self.BASE_URL, headers=headers, params=params)
            
            response.raise_for_status()
            data = response.json()
            raw_items = data.get("itemSummaries", [])
            
            # Apply strict filtering
            clean_items = self._filter_results(raw_items)
            
            return clean_items
            
        except requests.exceptions.RequestException as e:
            print(f"eBay API Error: {e}")
            if e.response:
                print(f"Response: {e.response.text}")
            return []

ebay_client = EbayClient()
