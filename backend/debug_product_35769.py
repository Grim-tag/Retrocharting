import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

from app.db.session import SessionLocal
# Import models
from app.models.game import Game
from app.models.product import Product

def check_product():
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == 35769).first()
        if p:
            print("--- Product Found ---")
            print(f"ID: {p.id}")
            print(f"Name: {p.product_name}")
            print(f"Console: {p.console_name}")
            print(f"Genre: {p.genre}")
            print(f"Game Slug: {p.game_slug}")
            
            if not p.game_slug:
                 print("WARNING: Game Slug is NULL. This is why ID is in URL.")
        else:
            print("Product 35769 not found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_product()
