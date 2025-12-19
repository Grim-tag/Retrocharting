import sys
import os

# Set absolute path to backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.collection_item import CollectionItem
from app.models.product import Product
from app.models.comment import Comment
from app.models.sniper import SniperResult
from app.models.sales_transaction import SalesTransaction

def check():
    db = SessionLocal()
    try:
        # Check what consoles exist that look like PC
        consoles = db.query(Product.console_name).filter(Product.console_name.ilike('%pc%')).distinct().all()
        print("Found consoles matching PC:", consoles)
        
        count_exact = db.query(Product).filter(Product.console_name == "PC Games").count()
        print(f"Exact count 'PC Games': {count_exact}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
