import sys
import os
from dotenv import load_dotenv

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_path)

# Load .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', '.env')
load_dotenv(env_path)

from app.services.ebay_client import ebay_client

def test_search():
    query = "1942 NES"
    print(f"Searching for: {query} in category 139973 (Video Games)")
    
    results = ebay_client.search_items(query, limit=5, category_ids="139973")
    
    print(f"Found {len(results)} results:")
    for item in results:
        print(f"- {item.get('title')} ({item.get('price', {}).get('value')} {item.get('price', {}).get('currency')})")
        print(f"  Category: {item.get('categories')}")

if __name__ == "__main__":
    test_search()
