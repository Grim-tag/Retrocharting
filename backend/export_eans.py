import sys
import os
import json

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))

from app.db.session import SessionLocal
# Full Imports
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.models.comment import Comment
from app.models.collection_item import CollectionItem
from app.models.user import User
from app.models.sniper import SniperWatch
from app.models.scraper_log import ScraperLog
from app.models.product import Product

def export_eans():
    db = SessionLocal()
    try:
        # Get all products with EAN
        products = db.query(Product).filter(
            Product.ean != None,
            Product.ean != ""
        ).all()
        
        data = []
        for p in products:
            data.append({
                "pricecharting_id": p.pricecharting_id, # Stable Key
                "product_name": p.product_name, # Backup Key
                "console_name": p.console_name,
                "ean": p.ean
            })
            
        print(f"Exporting {len(data)} items...")
        
        with open("eans_export.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        print("Export saved to eans_export.json")
        
    finally:
        db.close()

if __name__ == "__main__":
    export_eans()
