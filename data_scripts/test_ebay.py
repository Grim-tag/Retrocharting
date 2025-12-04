import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

from app.services.ebay_client import ebay_client

def test_search():
    print("Testing eBay Search...")
    query = "Super Mario 64 Nintendo 64"
    results = ebay_client.search_items(query, limit=5)
    
    if results:
        print(f"Success! Found {len(results)} items.")
        for item in results:
            title = item.get('title', 'No Title')
            price = item.get('price', {}).get('value', 'N/A')
            print(f"- {title} ({price} EUR)")
    else:
        print("No results found or API error.")

if __name__ == "__main__":
    test_search()
