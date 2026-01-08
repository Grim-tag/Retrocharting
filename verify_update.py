
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.scraper import _update_product_via_api
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.sales_transaction import SalesTransaction

def verify_update():
    db = SessionLocal()
    try:
        # Get or Create a test product
        product = db.query(Product).filter(Product.product_name == "Super Mario 64").first()
        if not product:
            print("Creating test product Super Mario 64...")
            product = Product(
                product_name="Super Mario 64", 
                console_name="Nintendo 64",
                loose_price=0.0
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            
        print(f"Testing Update for: {product.product_name} (ID: {product.id})")
        print(f"Current Prices -> Loose: {product.loose_price}, Box: {product.box_only_price}, Manual: {product.manual_only_price}")
        
        # Run Update
        if settings.PRICECHARTING_API_TOKEN:
            print("Token found. Running API update...")
            success = _update_product_via_api(db, product)
            db.commit()
            db.refresh(product)
            
            if success:
                print("Update Success!")
                print(f"New Prices -> Loose: {product.loose_price}, Box: {product.box_only_price}, Manual: {product.manual_only_price}")
                
                if product.box_only_price and product.box_only_price > 0:
                    print("VERIFICATION PASSED: Box Price populated.")
                else:
                    print("VERIFICATION WARNING: Box Price is 0 or None.")
            else:
                print("Update Failed.")
        else:
            print("No Token in settings.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_update()
