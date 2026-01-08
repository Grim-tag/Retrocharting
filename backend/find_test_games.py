from app.db.session import SessionLocal
from app.models.game import Game
from sqlalchemy import func

db = SessionLocal()

try:
    # Find a title with at least 3 platforms
    # We'll try some common names first to avoid complex grouping if possible, 
    # but grouping is more robust.
    
    # Let's try "Resident Evil 4" or "Sonic Heroes" or "Rayman Legends"
    # Actually, let's query for titles appearing > 2 times.
    
    subquery = db.query(Game.title).group_by(Game.title).having(func.count(Game.id) >= 3).limit(5).all()
    
    candidates = [r[0] for r in subquery]
    
    for title in candidates:
        print(f"Checking candidate: {title}")
        games = db.query(Game).filter(Game.title == title).limit(3).all()
        if len(games) >= 3:
            print(f"FOUND: {title}")
            for g in games:
                print(f" - Console: {g.console_name} | Slug: {g.slug}")
            break

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
