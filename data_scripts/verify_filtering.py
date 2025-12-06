import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.db.session import SessionLocal
from app.models.product import Product
from app.routers.products import update_listings_background

def verify():
    db = SessionLocal()
    
    # 1. Component (Console)
    console = db.query(Product).filter(Product.genre == 'Systems').first()
    if console:
        print(f"\n--- Testing Console: {console.product_name} (ID: {console.id}) ---")
        try:
            update_listings_background(console.id)
        except Exception as e:
            print(e)
            
    # 2. Accessory
    accessory = db.query(Product).filter(Product.genre.in_(['Accessories', 'Controllers'])).first()
    if accessory:
        print(f"\n--- Testing Accessory: {accessory.product_name} (ID: {accessory.id}) ---")
        try:
             update_listings_background(accessory.id)
        except Exception as e:
            print(e)

    # 3. Game
    game = db.query(Product).filter(Product.genre.notin_(['Systems', 'Accessories', 'Controllers'])).first()
    if game:
        print(f"\n--- Testing Game: {game.product_name} (ID: {game.id}) ---")
        try:
            update_listings_background(game.id)
        except Exception as e:
            print(e)

if __name__ == "__main__":
    verify()
