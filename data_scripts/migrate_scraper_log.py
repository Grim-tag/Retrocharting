import os
import sys

# Load .env manually before app imports
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
from dotenv import load_dotenv
load_dotenv(env_path)

# Add backend to path BEFORE importing app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

from app.db.session import SessionLocal
from sqlalchemy import text, inspect

def run_migration():
    print("Migrating/Creating scraper_logs table...")
    db = SessionLocal()
    try:
        # Check if table exists
        bind = db.get_bind()
        inspector = inspect(bind)
        
        if 'scraper_logs' not in inspector.get_table_names():
            print("Creating table scraper_logs...")
            if 'sqlite' in bind.dialect.name:
                db.execute(text("""
                    CREATE TABLE scraper_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                        end_time DATETIME,
                        items_processed INTEGER DEFAULT 0,
                        status VARCHAR,
                        error_message VARCHAR
                    )
                """))
            else:
                 # Postgres
                 db.execute(text("""
                    CREATE TABLE scraper_logs (
                        id SERIAL PRIMARY KEY,
                        start_time TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc'),
                        end_time TIMESTAMP WITHOUT TIME ZONE,
                        items_processed INTEGER DEFAULT 0,
                        status VARCHAR,
                        error_message VARCHAR
                    )
                """))
            print("  Table created.")
        else:
            print("  Table scraper_logs already exists.")
            
        db.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
