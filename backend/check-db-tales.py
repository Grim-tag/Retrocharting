from app.db.session import SessionLocal
from app.models.game import Game

db = SessionLocal()
print(f"Searching DB for 'Tales of the Sword Coast'")

try:
    games = db.query(Game).filter(Game.title.ilike(f"%Tales of the Sword Coast%")).all()
    for g in games:
        print(f" - Found: {g.slug}")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
