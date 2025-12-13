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
    # Check new prices
    try:
        conn.execute(text("SELECT box_only_price FROM products LIMIT 1"))
        print("'box_only_price' exists.")
    except Exception:
        print("Adding 'box_only_price'...")
        conn.execute(text("ALTER TABLE products ADD COLUMN box_only_price FLOAT"))
        conn.commit()
        print("Done.")

    try:
        conn.execute(text("SELECT manual_only_price FROM products LIMIT 1"))
        print("'manual_only_price' exists.")
    except Exception:
        print("Adding 'manual_only_price'...")
        conn.execute(text("ALTER TABLE products ADD COLUMN manual_only_price FLOAT"))
        conn.execute(text("ALTER TABLE products ADD COLUMN pricecharting_id INTEGER")) 
        # Also ensuring PC ID exists just in case
        conn.commit()
        print("Done.")

    # Phase 2: User Profile
    try:
        conn.execute(text("SELECT bio FROM users LIMIT 1"))
        print("'bio' exists.")
    except Exception:
        print("Adding 'bio' and 'is_collection_public'...")
        conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN is_collection_public BOOLEAN DEFAULT false"))
        conn.commit()
        print("Done.")
