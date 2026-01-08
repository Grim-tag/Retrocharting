import sys
import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Setup Path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.db.session import SessionLocal
from app.models.product import Product
from app.models.listing import Listing
from app.services.listing_classifier import ListingClassifier

def inspect_products():
    db = SessionLocal()
    try:
        # IDs given by user
        ids = [90708, 90709, 90710] 
        
        print("\n--- Product Inspection ---")
        products = db.query(Product).filter(Product.id.in_(ids)).all()
        for p in products:
            region = ListingClassifier.detect_region(p.console_name, p.product_name)
            print(f"ID: {p.id}")
            print(f"Name: '{p.product_name}'")
            print(f"Console: '{p.console_name}'")
            print(f"Detected Region: {region}")
            
            listings = db.query(Listing).filter(Listing.product_id == p.id, Listing.source == 'Amazon').all()
            print(f"Amazon Listings: {len(listings)}")
            for l in listings:
                print(f"  - [{l.currency}] {l.price} ({l.seller_name}) - {l.url}")
            print("-" * 30)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_products()
