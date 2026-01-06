from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product

db = SessionLocal()

# 1. Check Product 184920
pid = 184920
p = db.query(Product).filter(Product.id == pid).first()
if p:
    print(f"Product {pid} EXISTS: {p.product_name} (Game ID: {p.game_id})")
    if p.game_id:
        g = db.query(Game).filter(Game.id == p.game_id).first()
        if g:
            print(f" -> Linked to Game: {g.title} (Slug: {g.slug})")
        else:
            print(f" -> Linked to MISSING Game ID {p.game_id}")
    else:
        print(" -> ORPHAN (No Game ID)")
else:
    print(f"Product {pid} DOES NOT EXIST.")

# 2. Check a unified slug
slug = "007-blood-stone-pc-games" # derived from user url
g = db.query(Game).filter(Game.slug == slug).first()
if g:
    print(f"Game with slug '{slug}' EXISTS: {g.title}")
else:
    print(f"Game with slug '{slug}' NOT FOUND.")
    # Try ilike
    g = db.query(Game).filter(Game.slug.ilike(f"%007%")).first()
    if g:
         print(f"Found similar game: {g.slug}")

db.close()
