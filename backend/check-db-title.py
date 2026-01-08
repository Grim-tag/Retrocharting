from app.db.session import SessionLocal
from app.models.game import Game

db = SessionLocal()
print(f"Searching DB for Game TITLE like 'Baldur%'")

try:
    games = db.query(Game).filter(Game.title.ilike(f"%Baldur%")).limit(10).all()
    for g in games:
        print(f" - Found: {g.slug} | {g.title} | {g.console_name}")
        
    if not games:
        print("No games found matching title 'Baldur%'. Checking 'Products' table fallback...")
        from app.models.product import Product
        products = db.query(Product).filter(Product.product_name.ilike(f"%Baldur%")).limit(5).all()
        for p in products:
             print(f" - Product Candidate: {p.product_name} | {p.console_name} (No Game Entry?)")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
