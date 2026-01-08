from app.db.session import SessionLocal
from app.models.product import Product
from app.models.game import Game
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.sales_transaction import SalesTransaction
from app.models.comment import Comment
from sqlalchemy import or_

def check_status():
    db = SessionLocal()
    try:
        # Same filter logic as price_recovery.py
        # Candidates: Has PC ID, but CIB Price is missing/zero
        query = db.query(Product).filter(
            Product.pricecharting_id != None,
            or_(Product.cib_price == None, Product.cib_price == 0.0)
        )
        
        count = query.count()
        total_products = db.query(Product).count()
        
        print(f"Total Products in DB: {total_products}")
        print(f"Remaining for Price Recovery: {count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_status()
