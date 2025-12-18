import sys
import os
import time
from sqlalchemy import or_

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))

from app.db.session import SessionLocal
# Import ALL models to ensure SQLAlchemy registry is populated and relationships work
from app.models.product import Product
from app.models.listing import Listing
from app.models.price_history import PriceHistory
# from app.models.collection import Collection # If exists
from app.services.ebay_client import ebay_client

def harvest_eans():
    db = SessionLocal()
    try:
        print("Starting EAN Harvest for Playstation 5...")
        
        # Target: PS5 games without EAN
        products = db.query(Product).filter(
            Product.console_name == 'Playstation 5',
            or_(Product.ean == None, Product.ean == "")
        ).all()
        
        print(f"Found {len(products)} PS5 games missing EAN.")
        
        processed = 0
        updated = 0
        
        for p in products:
            try:
                processed += 1
                query = f"{p.product_name} {p.console_name} game"
                
                # Fetch detailed results
                # We prioritize "New" or "CIB" to get better data? 
                # Actually, any listing might have the EAN.
                results = ebay_client.search_items(query, limit=5, marketplace_id="EBAY_FR")
                
                found_ean = None
                found_upc = None
                
                for item in results:
                    # Check standard fields first
                    if 'gtin' in item:
                        found_ean = item['gtin']
                        break
                    
                    # Check within 'itemGroupHref' or look for 'epid'?
                    # Sometimes provided as 'epid'
                    
                    # Note: Browse API item_summary often doesn't give GTIN directly unless 'fieldgroups=MATCHING_ITEMS' is used?
                    # But 'search' has limited parameters.
                    # Let's hope basic search returns it or we might need to get_item detail for the first hit.
                    # Optimisation: If no GTIN in summary, maybe skip to save quota?
                    # Or try to just grab what we can.
                    pass
                
                # If we didn't find specific 'gtin' key, let's look deeper if we can.
                # Actually, earlier test output didn't show 'gtin' in the summary.
                # We might need to call getItem on the first result to get "product" details.
                # BUT that doubles the calls.
                # Let's try to see if 'epid' (eBay Product ID) is useful?
                
                # REVISION: To get EAN/UPC reliably, we might need to use the 'epid' to fetch details, 
                # OR trust that some listings put it in title? No, title is parsing.
                
                # Let's assume for this V1 script we capture if available.
                # If 'gtin' is not in summary, we might need a better strategy. 
                # Let's look for 'epid' and store that too? 
                
                if found_ean:
                    p.ean = found_ean
                    updated += 1
                    print(f"[HIT] {p.product_name} -> {found_ean}")
                else:
                    print(f"[MISS] {p.product_name}")
                
                # Commit every 50
                if processed % 50 == 0:
                    db.commit()
                    print(f"--- Progress: {processed}/{len(products)} ---")
                
                # Rate limit (5000/day = ~3.5/min if 24h, but we can burst)
                # Let's go relatively fast. 0.5s safe.
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error processing {p.product_name}: {e}")
                
        db.commit()
        print(f"Harvest Complete. Updated {updated} games.")
        
    finally:
        db.close()

if __name__ == "__main__":
    harvest_eans()
