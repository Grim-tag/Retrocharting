import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

print(f"Loaded DATABASE_URL: {os.getenv('DATABASE_URL')}")

from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
from app.models.sales_transaction import SalesTransaction
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from sqlalchemy import func

def check_db():
    db: Session = SessionLocal()
    
    # Check count of all products
    total_count = db.query(Product).count()
    print(f"Total products in DB: {total_count}")
    
    # Check for Playstation 2 specifically
    ps2_count = db.query(Product).filter(Product.console_name == "Playstation 2").count()
    print(f"Products with console_name='Playstation 2': {ps2_count}")
    
    # Check for Hardware
    print("\nChecking for Hardware...")
    hardware_count = db.query(Product).filter(Product.product_name.ilike("%Console%")).count()
    print(f"Products with 'Console' in name: {hardware_count}")
    
    if hardware_count > 0:
        example = db.query(Product).filter(Product.product_name.ilike("%Console%")).first()
        print(f"Example: {example.product_name} ({example.console_name}) - Genre: {example.genre}")
        
        # Check unique genres for items with "Console" in name
        genres = db.query(Product.genre).filter(Product.product_name.ilike("%Console%")).distinct().all()
        print(f"Genres found for 'Console' items: {[g[0] for g in genres]}")

    # Check Price History
    history_count = db.query(PriceHistory).count()
    print(f"\nTotal Price History Records: {history_count}")
    
    if history_count > 0:
        example = db.query(PriceHistory).first()
        print(f"Example History: Product {example.product_id} | {example.date} | ${example.price} | {example.condition}")

if __name__ == "__main__":
    check_db()
