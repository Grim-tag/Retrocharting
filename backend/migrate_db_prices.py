
from sqlalchemy import create_engine, text
import os
import sys

# Add parent directory to path to import app modules if needed (though we use raw SQL here for simplicity)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def run_migration():
    print("Connecting to database...")
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as connection:
        print("Adding box_only_price column...")
        try:
            connection.execute(text("ALTER TABLE products ADD COLUMN box_only_price FLOAT DEFAULT NULL"))
            print("Verified: box_only_price added.")
        except Exception as e:
            print(f"Notice: {e} (Column might already exist)")

        print("Adding manual_only_price column...")
        try:
            connection.execute(text("ALTER TABLE products ADD COLUMN manual_only_price FLOAT DEFAULT NULL"))
            print("Verified: manual_only_price added.")
        except Exception as e:
            print(f"Notice: {e} (Column might already exist)")
            
        connection.commit()
    
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
