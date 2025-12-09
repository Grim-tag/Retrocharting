import os
import sys

# Load .env manually before app imports
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
from dotenv import load_dotenv
load_dotenv(env_path)

# Mock missing envs to satisfy Settings if needed (or ensure .env has them)
# But .env should be enough.

from app.db.session import SessionLocal
from sqlalchemy import text, inspect

def run_migration():
    db = SessionLocal()
    try:
        inspector = inspect(db.get_bind())
        columns = [c['name'] for c in inspector.get_columns('products')]
        
        if 'last_scraped' not in columns:
            print("Adding 'last_scraped' column to products...")
            # Detect DB Type
            bind = db.get_bind()
            if 'sqlite' in bind.dialect.name:
                db.execute(text("ALTER TABLE products ADD COLUMN last_scraped DATETIME"))
            else:
                db.execute(text("ALTER TABLE products ADD COLUMN last_scraped TIMESTAMP WITHOUT TIME ZONE"))
            print("  Success.")
        else:
            print("'last_scraped' column already exists.")

        db.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import os
    import sys
    # Add backend to path
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))
    run_migration()
