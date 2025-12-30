from app.db.session import engine, Base
from app.db.migrations import run_auto_migrations
from app.models.game import Game
from sqlalchemy import text

def migrate():
    print("Forcing schema migration...")
    
    # 1. Create new table 'games'
    Base.metadata.create_all(bind=engine)
    print("Tables created (if missing).")
    
    # 2. Add columns to 'products' using the util
    run_auto_migrations(engine)
    
    print("Migration done.")

if __name__ == "__main__":
    migrate()
