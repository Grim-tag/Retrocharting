import sys
import os
import json

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))

from app.services.ebay_client import ebay_client

def test_ebay_gtin():
    # Test with a known PS5 game
    query = "God of War Ragnarok PS5"
    print(f"Searching eBay for: {query}")
    
    # We want to see the RAW response structure to find GTINs
    # The current client filters results, but let's peek at what it gets or if we can ask for more fields.
    # The client method 'search_items' returns a simplified dict. 
    # Let's bypass the client's cleaning logic slightly or inspect the client code again?
    # Actually, let's just use the client and print the result. If fields are missing in the client's return dict,
    # we might need to modify the client.
    
    results = ebay_client.search_items(query, limit=5)
    
    for item in results:
        print("--- ITEM ---")
        print(f"Title: {item.get('title')}")
        print(f"Price: {item.get('price')}")
        # The client currently returns 'clean_items'. 
        # Does it preserve other keys?
        # Looking at ebay_client.py:
        # clean_items.append(item) -> It appends the raw item dict (minus skipped ones).
        # So we should see all fields returned by eBay API.
        print(json.dumps(item, indent=2))

if __name__ == "__main__":
    test_ebay_gtin()
