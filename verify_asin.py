import sys
import os

# Ensure backend path is in sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.db.session import SessionLocal
from backend.app.models.product import Product
from backend.app.models.listing import Listing
from backend.app.models.price_history import PriceHistory
from backend.app.models.sales_transaction import SalesTransaction
from backend.app.models.user import User
from backend.app.models.comment import Comment

def verify_product(product_id):
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            print(f"Product {product_id} NOT FOUND.")
            return
            
        print(f"--- Product {product_id} ---")
        print(f"Name: {p.product_name}")
        print(f"Console: {p.console_name}")
        
        # Check attributes safely
        asin = getattr(p, 'asin', 'ATTR_NOT_EXIST')
        ean = getattr(p, 'ean', 'ATTR_NOT_EXIST')
        
        print(f"ASIN: {asin}")
        print(f"EAN: {ean}")
        
        print("\n--- Listings ---")
        listings = db.query(Listing).filter(Listing.product_id == product_id).all()
        for l in listings:
            print(f"[{l.source}] {l.title} ({l.price} {l.currency}) - St: {l.status} - ExtID: {l.external_id}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_product(66716)
    verify_product(66717)
