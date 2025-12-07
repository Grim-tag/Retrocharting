import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

if not os.environ.get("DATABASE_URL"):
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'collector.db')
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
from app.models.sales_transaction import SalesTransaction

def inspect_bad_products():
    db = SessionLocal()
    from sqlalchemy import or_
    
    # Replicate scraper query
    products = db.query(Product).outerjoin(PriceHistory).filter(
        or_(Product.description == None, PriceHistory.id == None)
    ).distinct().limit(50).all()
    
    print(f"Scraper query found {len(products)} products.")
    
    count_bad = 0
    for p in products:
        if not p.console_name or not p.product_name:
            count_bad += 1
            print(f"BAD PRODUCT: ID={p.id}, Name='{p.product_name}', Console='{p.console_name}'")
            
    print(f"Total bad products in scraper batch: {count_bad}")

if __name__ == "__main__":
    inspect_bad_products()
