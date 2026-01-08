from app.db.session import SessionLocal
from app.db.session import SessionLocal
from app.models.user import User
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.collection_item import CollectionItem
from app.models.comment import Comment
from app.models.sniper import SniperResult, SniperWatch, SniperQuery
from app.models.sales_transaction import SalesTransaction
from app.models.product import Product
from sqlalchemy import func

def check_genres():
    db = SessionLocal()
    try:
        # Console Genres (excluding PC)
        console_genres = db.query(Product.genre, func.count(Product.id))\
            .filter(Product.console_name != 'PC Games')\
            .filter(Product.genre != None)\
            .group_by(Product.genre)\
            .order_by(func.count(Product.id).desc())\
            .all()
            
        print("--- CONSOLE GENRES ---")
        for g, c in console_genres:
            print(f"{g}: {c}")

        print("\n--- PC GENRES ---")
        pc_genres = db.query(Product.genre, func.count(Product.id))\
            .filter(Product.console_name == 'PC Games')\
            .filter(Product.genre != None)\
            .group_by(Product.genre)\
            .order_by(func.count(Product.id).desc())\
            .all()
            
        for g, c in pc_genres:
            print(f"{g}: {c}")

    finally:
        db.close()

if __name__ == "__main__":
    check_genres()
