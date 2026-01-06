from app.db.session import SessionLocal
from app.routers.games import read_games

db = SessionLocal()
try:
    print("Testing read_games()...")
    games = read_games(skip=0, limit=10, db=db)
    print(f"Games Found: {len(games)}")
    if games:
        print(f"Sample: {games[0]}")
    else:
        print("WARNING: No games returned.")

    print("\nTesting read_games(console='Nintendo Switch')...")
    switch_games = read_games(console="Nintendo Switch", db=db)
    print(f"Switch Games: {len(switch_games)}")

except Exception as e:
    print(f"ERROR: {e}")
finally:
    db.close()
