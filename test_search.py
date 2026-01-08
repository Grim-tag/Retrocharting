import sys
import os

# Ensure backend path is in sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.services.amazon_client import AmazonClient

class MockProduct:
    def __init__(self, asin, ean, name, console):
        self.asin = asin
        self.ean = ean
        self.product_name = name
        self.console_name = console

def test_search():
    client = AmazonClient()
    
    asins = ["B0FP2S1MNB", "B0FN7ZG39D"]
    
    for asin in asins:
        print(f"\n--- Testing ASIN {asin} ---")
        results = client.search_items(asin, limit=1, domain="amazon.fr")
        
        if not results:
            print("NO RESULTS returned from Amazon Client.")
        
        for r in results:
            print(f"[ASIN {asin}] Found: {r['title']} | ASIN: {r['asin']} | Price: {r['price']}")

if __name__ == "__main__":
    test_search()
