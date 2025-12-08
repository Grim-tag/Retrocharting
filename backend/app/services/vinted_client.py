
import requests
import random
import time
import urllib.parse

class VintedClient:
    ZENROWS_API_KEY = "d4e9a47779876433a451ed50a536670d97e56182"
    ZENROWS_URL = "https://api.zenrows.com/v1/"
    VINTED_API_URL = "https://www.vinted.fr/api/v2/catalog/items"

    def search(self, query: str, limit: int = 20):
        """
        Searches for items on Vinted using ZenRows to bypass 403 blocks.
        """
        debug_info = {"status": "unknown", "provider": "ZenRows"}

        # Construct target Vinted URL
        # Vinted params
        vinted_params = {
            "search_text": query,
            "order": "newest_first",
            "per_page": limit,
        }
        # Encode params manually to append to the URL string passed to ZenRows
        encoded_params = urllib.parse.urlencode(vinted_params)
        target_url = f"{self.VINTED_API_URL}?{encoded_params}"

        # ZenRows Params
        params = {
            "apikey": self.ZENROWS_API_KEY,
            "url": target_url,
            "js_render": "false", 
            "premium_proxy": "true", 
            "antibot": "true", # Enable Datadome/Cloudflare bypass
        }
        
        try:
            # No cookies needed, ZenRows handles the rotation/session
            print(f"Calling ZenRows for: {target_url}")
            response = requests.get(self.ZENROWS_URL, params=params, timeout=60)
            
            debug_info["http_code"] = response.status_code
            
            if response.status_code != 200:
                print(f"ZenRows Error: {response.text}")
                # return error with body included for debugging
                return {
                    "items": [], 
                    "debug": {
                        "error": f"ZenRows {response.status_code}: {response.text}", 
                        "http_code": response.status_code
                    }
                }

            data = response.json()
            # ZenRows returns the raw content of the target URL. 
            # If target returns JSON, ZenRows body might be JSON.
            # However, sometimes ZenRows wraps it? No, usually raw content.
            
            return {"items": data.get("items", []), "debug": debug_info}
            
        except Exception as e:
            print(f"Vinted/ZenRows Fatal Error: {e}")
            import traceback
            traceback.print_exc()
            return {"items": [], "debug": {"error": str(e), "trace": traceback.format_exc()}}

vinted_client = VintedClient()
