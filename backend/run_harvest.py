import sys
import os

# Ensure backend root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from app.db.session import SessionLocal
# Import models in specific order if relationships are fragile
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.models.comment import Comment
from app.models.collection_item import CollectionItem
from app.models.user import User
from app.models.sniper import SniperWatch, SniperResult # Assuming these exist
from app.models.scraper_log import ScraperLog
from app.models.translation import Translation
from app.models.product import Product # Product usually depends on others for relations

from app.services.ebay_client import ebay_client
from sqlalchemy import or_
import time

def run():
    db = SessionLocal()
    try:
        print("Starting EAN Harvest (Module Mode)...")
        products = db.query(Product).filter(
            Product.console_name == 'Playstation 5',
            or_(Product.ean == None, Product.ean == "")
        ).all()
        
        print(f"Found {len(products)} candidates.")
        updated = 0
        
        for i, p in enumerate(products):
            try:
                query = f"{p.product_name} {p.console_name} game"
                # Use clean results
                results = ebay_client.search_items(query, limit=5, marketplace_id="EBAY_FR")
                found_ean = None
                
                # Check explicit GTIN in search results first
                for item in results:
                    if 'gtin' in item:
                        found_ean = item['gtin']
                        break
                
                # If NOT found, go DEEP (Get Item Details)
                if not found_ean and results:
                    import requests
                    if not ebay_client.token: ebay_client.get_access_token()
                    
                    headers = {
                        "Authorization": f"Bearer {ebay_client.token}",
                        "Content-Type": "application/json",
                        "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR"
                    }

                    for item in results: # Check top 3 items to save quota
                        try:
                            item_id = item.get('itemId')
                            if not item_id: continue
                            
                            detail_url = f"https://api.ebay.com/buy/browse/v1/item/{item_id}"
                            resp = requests.get(detail_url, headers=headers, timeout=5)
                            
                            if resp.status_code == 200:
                                data = resp.json()
                                # Check top level
                                if 'gtin' in data: found_ean = data['gtin']
                                elif 'ean' in data: found_ean = data['ean']
                                elif 'upc' in data: found_ean = data['upc']
                                
                                # Check Localized Aspects
                                if not found_ean and 'localizedAspects' in data:
                                    for aspect in data['localizedAspects']:
                                        aname = aspect.get('name', '').lower()
                                        aval = aspect.get('value', '')
                                        if aname in ['ean', 'gtin', 'upc', 'code ean']:
                                            found_ean = aval
                                            break
                                            
                                if found_ean: break
                        except Exception:
                            pass
                        
                        target_ean = found_ean
                    
                if found_ean:
                    p.ean = found_ean
                    updated += 1
                    print(f"[HIT] {p.product_name} -> {found_ean}")
                else:
                    print(f"[MISS] {p.product_name}")
                    
                if i % 10 == 0:
                    db.commit()
            except Exception as e:
                print(f"Error: {e}")
            
            # Rate limit adjustment: Deep search is heavy
            time.sleep(1.0)
            
        db.commit()
        print(f"Done. Updated {updated}.")
    finally:
        db.close()

if __name__ == "__main__":
    run()
