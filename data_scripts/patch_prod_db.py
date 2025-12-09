import os
import sys
from sqlalchemy import create_engine, text

# Get database URL from env or input
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set.")
    # Attempt to ask user or hard fail
    sys.exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    print("Checking columns...")
    
    # Check listings
    try:
        conn.execute(text("SELECT is_good_deal FROM listings LIMIT 1"))
        print("'is_good_deal' exists.")
    except Exception:
        print("Adding 'is_good_deal'...")
        conn.execute(text("ALTER TABLE listings ADD COLUMN is_good_deal BOOLEAN DEFAULT 0"))
        conn.commit()
        print("Done.")

    # Check products
    try:
        conn.execute(text("SELECT players FROM products LIMIT 1"))
        print("'players' exists.")
    except Exception:
        print("Adding 'players'...")
        conn.execute(text("ALTER TABLE products ADD COLUMN players TEXT"))
        conn.commit()
        print("Done.")
