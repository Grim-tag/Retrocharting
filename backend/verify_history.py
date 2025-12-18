import sys
import os
from sqlalchemy import func

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))

from app.db.session import SessionLocal
# Dependencies for Product
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.models.comment import Comment
from app.models.collection_item import CollectionItem
from app.models.user import User
from app.models.sniper import SniperWatch
from app.models.scraper_log import ScraperLog
from app.models.product import Product

def verify():
    db = SessionLocal()
    try:
        print("--- PRICE HISTORY CHECK ---")
        
        # 1. Total Count
        total_rows = db.query(PriceHistory).count()
        print(f"Total History Rows: {total_rows}")
        
        # 2. Daily Count (Today)
        today = func.current_date()
        today_rows = db.query(PriceHistory).filter(PriceHistory.date == today).count()
        print(f"Rows for Today: {today_rows}")
        
        # 3. Sample check for a PS5 game
        game = db.query(Product).filter(Product.console_name == 'Playstation 5').first()
        if game:
            print(f"\nChecking sample: {game.product_name}")
            history = db.query(PriceHistory).filter(PriceHistory.product_id == game.id).order_by(PriceHistory.date.desc()).all()
            for h in history:
                print(f" - {h.date}: {h.condition} = {h.price}€")
        else:
            print("No PS5 games found.")
            
    finally:
        db.close()

if __name__ == "__main__":
    verify()
