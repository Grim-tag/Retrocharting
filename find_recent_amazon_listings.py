import sys
import os
from datetime import datetime, timedelta

# Ensure backend path is in sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.db.session import SessionLocal
from backend.app.models.product import Product
from backend.app.models.listing import Listing

def find_recent_amazon_listings():
    db = SessionLocal()
    try:
        # Define "today" as starting from midnight today local time (or UTC if that's what's stored)
        # The model uses datetime.utcnow, so we should filter by that.
        # User current time is 2025-12-20T17:30:20+01:00. This is 16:30 UTC.
        # "Morning" would be earlier today. Let's look for anything updated in the last 12 hours.
        
        cutoff_time = datetime.utcnow() - timedelta(hours=14) # Approx start of day UTC
        
        print(f"Searching for Amazon listings updated since {cutoff_time} UTC...")
        
        listings = db.query(Listing).join(Product).filter(
            Listing.source.ilike('%Amazon%'),
            Listing.last_updated >= cutoff_time
        ).order_by(Listing.last_updated.desc()).limit(20).all()
        
        if not listings:
            print("No Amazon listings found updated today.")
            return

        unique_products = {}
        for l in listings:
            if l.product_id not in unique_products:
                unique_products[l.product_id] = {
                    "product_name": l.product.product_name,
                    "console": l.product.console_name,
                    "listing_title": l.title,
                    "price": l.price,
                    "currency": l.currency,
                    "updated": l.last_updated
                }
            if len(unique_products) >= 5:
                break
        
        if not unique_products:
             print("Found listings but no associated products? (Unlikely due to join)")

        for pid, data in unique_products.items():
            print(f"Product ID: {pid}")
            print(f"  Game: {data['product_name']} ({data['console']})")
            print(f"  Price: {data['price']} {data['currency']}")
            print(f"  Updated: {data['updated']}")
            print(f"  Listing: {data['listing_title']}")
            print("-" * 30)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    find_recent_amazon_listings()
