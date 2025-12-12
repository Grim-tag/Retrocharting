
import sys
import os

# Add path to allow imports from backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.services.scraper import _update_product_via_api
from app.models.product import Product

def force_update():
    db = SessionLocal()
    try:
        # Try finding Super Mario 64 (N64) which usually has ID around 3924 on PC, 
        # but let's search by name in our DB
        print("Searching for Super Mario 64...")
        product = db.query(Product).filter(Product.product_name.ilike("%Super Mario 64%"), Product.console_name.ilike("%Nintendo 64%")).first()
        
        if not product:
            print("Product not found in DB.")
            return

        print(f"Found: {product.product_name} (ID: {product.id})")
        print("Forcing API Update...")
        
        success = _update_product_via_api(db, product)
        if success:
            db.commit()
            db.refresh(product)
            print("Update SUCCESS!")
            print(f"Box Price: {product.box_only_price}")
            print(f"Manual Price: {product.manual_only_price}")
        else:
            print("Update FAILED.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    force_update()
