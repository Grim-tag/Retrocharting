import sys
import os
from sqlalchemy import text

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

from app.db.session import engine

def add_columns():
    with engine.connect() as conn:
        print("Adding 'ean' column...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN ean VARCHAR"))
            print("Added 'ean'.")
        except Exception as e:
            print(f"Error adding 'ean' (might already exist): {e}")

        print("Adding 'gtin' column...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN gtin VARCHAR"))
            print("Added 'gtin'.")
        except Exception as e:
            print(f"Error adding 'gtin' (might already exist): {e}")

        conn.commit()

if __name__ == "__main__":
    add_columns()
