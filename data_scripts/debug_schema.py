import sys
import os
from sqlalchemy import text

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product as ProductModel
from app.schemas.product import Product as ProductSchema

def check_schema_validation():
    db = SessionLocal()
    try:
        # Fetch products like the API does
        products = db.query(ProductModel).filter(ProductModel.console_name == "NES").limit(5).all()
        print(f"Fetched {len(products)} products.")
        
        for p in products:
            print(f"Validating: {p.product_name}")
            try:
                # Validate against schema
                ProductSchema.from_orm(p)
                print("  OK")
            except Exception as e:
                print(f"  FAILED: {e}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_schema_validation()
