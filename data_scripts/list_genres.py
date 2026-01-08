import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
from sqlalchemy import func

def list_genres():
    db = SessionLocal()
    genres = db.query(Product.genre, func.count(Product.id)).group_by(Product.genre).all()
    for g, count in genres:
        print(f"{g}: {count}")

if __name__ == "__main__":
    list_genres()
