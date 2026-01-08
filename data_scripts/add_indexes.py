from sqlalchemy import create_engine, text
import sys
import os

# Add backend to path to import config if needed, or just use hardcoded path for the script
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.config import settings

def create_indexes():
    # Database URL from settings or environment
    # Assuming SQLite for local dev based on file list (collector.db)
    # But usually settings.DATABASE_URL is used.
    # Let's try to load from settings, fallback to hardcoded if needed for script.
    
    db_url = settings.DATABASE_URL
    print(f"🔌 Connecting to database...")
    
    engine = create_engine(db_url)
    
    commands = [
        "CREATE INDEX IF NOT EXISTS ix_products_genre ON products (genre)",
        "CREATE INDEX IF NOT EXISTS ix_products_loose_price ON products (loose_price)",
        "CREATE INDEX IF NOT EXISTS ix_products_cib_price ON products (cib_price)",
        "CREATE INDEX IF NOT EXISTS ix_products_new_price ON products (new_price)",
        "CREATE INDEX IF NOT EXISTS ix_products_console_name ON products (console_name)", # Already exists usually but good to ensure
    ]
    
    with engine.connect() as conn:
        for cmd in commands:
            try:
                print(f" Executing: {cmd}")
                conn.execute(text(cmd))
                print(f" ✅ Success")
            except Exception as e:
                print(f" ❌ Failed: {e}")
                
    print("\n🎉 Optimization Complete! Indexes added.")

if __name__ == "__main__":
    create_indexes()
