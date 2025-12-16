
from sqlalchemy import create_engine, text
import os

db_path = "collector.db"
if not os.path.exists(db_path):
    print("No DB found")
    exit()

engine = create_engine(f"sqlite:///{db_path}")
with engine.connect() as conn:
    print("Checking for Identifiers...")
    try:
        # Check if columns exist
        result = conn.execute(text("PRAGMA table_info(products)")).fetchall()
        cols = [r[1] for r in result]
        print(f"Columns found: {cols}")
        
        if 'asin' in cols:
            count = conn.execute(text("SELECT count(*) FROM products WHERE asin IS NOT NULL AND asin != ''")).scalar()
            print(f"Products with ASIN: {count}")
        else:
            print("ASIN column missing!")

        if 'ean' in cols:
            count = conn.execute(text("SELECT count(*) FROM products WHERE ean IS NOT NULL AND ean != ''")).scalar()
            print(f"Products with EAN: {count}")
        else:
            print("EAN column missing!")
            
    except Exception as e:
        print(f"Error: {e}")
