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
    
    # CASE 1: Product with ASIN
    p1 = MockProduct(asin="B0CKXMY3X7", ean=None, name="PlayStation 5 Call of Duty", console="PlayStation 5")
    print(f"--- Testing ASIN Search for {p1.asin} ---")
    results = client.search_product_smart(p1)
    for r in results:
        print(f"Found: {r['title']} - ASIN: {r['asin']} - Link: {r['link']}")

    if not results:
        print("NO RESULTS FOUND via ASIN smart search.")

if __name__ == "__main__":
    test_search()
