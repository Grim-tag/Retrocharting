import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product

def inspect_data():
    db = SessionLocal()
    
    print("--- Sample Consoles? ---")
    # Try to find things that look like consoles
    consoles = db.query(Product).filter(Product.product_name.like("%Console%")).limit(5).all()
    for p in consoles:
        print(f"ID: {p.id}, Name: {p.product_name}, Console: {p.console_name}, Genre: {p.genre}")

    print("\n--- Sample Systems Genre? ---")
    systems = db.query(Product).filter(Product.genre == 'Systems').limit(5).all()
    for p in systems:
        print(f"ID: {p.id}, Name: {p.product_name}, Console: {p.console_name}, Genre: {p.genre}")

    print("\n--- Sample Games ---")
    games = db.query(Product).filter(Product.genre != 'Systems').limit(5).all()
    for p in games:
        print(f"ID: {p.id}, Name: {p.product_name}, Console: {p.console_name}, Genre: {p.genre}")

if __name__ == "__main__":
    inspect_data()
