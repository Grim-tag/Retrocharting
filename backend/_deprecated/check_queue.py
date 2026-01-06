import sys
import os

# Setup Path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.db.session import SessionLocal
from app.models.product import Product
from app.services.listing_classifier import ListingClassifier

def check_queue():
    db = SessionLocal()
    try:
        # Mimic Worker Logic
        console_filter = "Playstation 5"
        query = db.query(Product).filter(Product.console_name == console_filter)
        candidates = query.order_by(Product.last_scraped.nullsfirst(), Product.last_scraped.asc()).limit(20).all()
        
        print(f"--- Top Candidates for {console_filter} ---")
        count = 0
        for p in candidates:
            region = ListingClassifier.detect_region(p.console_name, p.product_name)
            # Assuming PAL worker
            if region and region != "PAL":
                continue # Worker would skip
                
            print(f"ID: {p.id} | Title: {p.product_name} | Last Scraped: {p.last_scraped}")
            count += 1
            if count >= 10: break
            
    finally:
        db.close()

if __name__ == "__main__":
    check_queue()
