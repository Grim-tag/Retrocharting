import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found")
    sys.exit(1)

engine = create_engine(db_url)
product_id = 3830

with engine.connect() as conn:
    print(f"\n=== PRICE HISTORY FOR PRODUCT {product_id} ===")
    result = conn.execute(text("SELECT * FROM price_history WHERE product_id = :id ORDER BY date DESC"), {"id": product_id})
    rows = result.mappings().fetchall()
    
    if not rows:
        print("No price history records found.")
    else:
        for row in rows:
            print(dict(row))
