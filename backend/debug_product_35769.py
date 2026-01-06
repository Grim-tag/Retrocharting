# Helper script to inspect products
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'app'))

from app.db.session import SessionLocal
# Import Game FIRST then Product to solve circular ref
from app.models.game import Game
from app.models.product import Product

if __name__ == "__main__":
    db = SessionLocal()
    try:
        name = "Playstation 4 1TB Black Ops III Console"
        games = db.query(Game).filter(Game.title == name).all()

        print(f"--- Debugging Game Duplicates for: {name} ---")
        if not games:
            print("No games found with this exact title.")
        
        for g in games:
            print(f"Game ID: {g.id}")
            print(f"Slug: {g.slug}")
            print(f"Console: {g.console_name}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

