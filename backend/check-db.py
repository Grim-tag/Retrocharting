from app.db.session import SessionLocal
from app.models.game import Game
from sqlalchemy import text

import sys

db = SessionLocal()
slug = sys.argv[1] if len(sys.argv) > 1 else "baldur-s-gate-tales-of-the-sword-coast-pc-prices-value"
print(f"Checking DB for Game slug: {slug}")

try:
    game = db.query(Game).filter(Game.slug == slug).first()
    if game:
        print(f"FOUND: ID={game.id} Title='{game.title}'")
    else:
        print("NOT FOUND in 'games' table.")
        
        # Check partial
        # Check partial
        partial = slug[:10]
        print(f"Unsuccessful. Checking any slug like '{partial}%'...")
        games = db.query(Game).filter(Game.slug.like(f"{partial}%")).limit(5).all()
        for g in games:
            print(f" - Candidate: {g.slug} | {g.title}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
