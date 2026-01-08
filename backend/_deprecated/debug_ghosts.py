from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product
from sqlalchemy import func

db = SessionLocal()

# Count Games with NO products
# Left Outer Join Game -> Product, filter where Product is Null
total_games = db.query(Game).count()
active_games = db.query(Game.id).join(Product, Product.game_id == Game.id).distinct().count()
ghost_games = total_games - active_games

print(f"Total Games in DB: {total_games}")
print(f"Active Games (with at least 1 product): {active_games}")
print(f"Ghost Games (0 products): {ghost_games}")

if ghost_games > 0:
    print("Preview of ghosts:")
    ghosts = db.query(Game).outerjoin(Product, Product.game_id == Game.id).filter(Product.id == None).limit(5).all()
    for g in ghosts:
        print(f" - [{g.id}] {g.slug} (Console: {g.console_name})")
