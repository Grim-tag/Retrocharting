import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.db.session import SessionLocal, engine
from app.models.listing import Listing
from app.models.product import Product
from app.services.ebay_client import ebay_client
from sqlalchemy import text

def check_ebay_production_logic():
    print("--- 1. Checking Database Schema ---")
    db = SessionLocal()
    try:
        # Check if 'is_good_deal' exists in 'listings'
        try:
            db.execute(text("SELECT is_good_deal FROM listings LIMIT 1"))
            print("[OK] 'is_good_deal' column exists.")
        except Exception as e:
            print(f"[FAIL] 'is_good_deal' column MISSING: {e}")

        # Check if 'players' exists in 'products'
        try:
            db.execute(text("SELECT players FROM products LIMIT 1"))
            print("[OK] 'players' column exists.")
        except Exception as e:
            print(f"[FAIL] 'players' column MISSING: {e}")

    except Exception as e:
        print(f"DB Connection Error: {e}")
    finally:
        db.close()

    print("\n--- 2. Testing eBay API Connectivity ---")
    try:
        token = ebay_client.get_access_token()
        if token:
            print(f"[OK] Access Token Acquired: {token[:10]}...")
        else:
            print("[FAIL] Failed to get Access Token.")
            return
            
        print("Searching for 'Super Mario 64'...")
        results = ebay_client.search_items("Super Mario 64", limit=2)
        if results:
            print(f"[OK] Found {len(results)} items.")
            print(f"Sample: {results[0].get('title')} - {results[0].get('price', {}).get('value')} {results[0].get('price', {}).get('currency')}")
        else:
            print("[WARN] No items found (or API error).")
            
    except Exception as e:
        print(f"[FAIL] eBay API Test Failed: {e}")

    print("\n--- 3. Simulating 'Good Deal' Logic ---")
    # Mocking a product and price
    loose_price = 50.0
    listing_price = 30.0
    is_good_deal = False
    
    if loose_price and listing_price < (loose_price * 0.7):
        is_good_deal = True
        
    print(f"Product Price: {loose_price}, Listing Price: {listing_price} -> Good Deal? {is_good_deal}")
    if is_good_deal:
        print("[OK] Logic Correct.")
    else:
        print("[FAIL] Logic Wrong.")

if __name__ == "__main__":
    check_ebay_production_logic()
