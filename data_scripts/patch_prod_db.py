import os
import sys
from sqlalchemy import create_engine, text

# Get database URL from env or input
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set.")
    sys.exit(1)

engine = create_engine(db_url)

def safe_add_column(conn, table, column, sql_alter):
    """Safely adds a column if it doesn't exist, handling transaction rollback."""
    try:
        conn.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
        print(f"'{column}' in '{table}' exists.")
    except Exception:
        # Important: Rollback the failed transaction (checking column existence)
        conn.rollback()
        print(f"Adding '{column}' to '{table}'...")
        try:
            conn.execute(text(sql_alter))
            conn.commit()
            print("Done.")
        except Exception as e:
            print(f"Failed to add {column}: {e}")
            conn.rollback()

with engine.connect() as conn:
    print("Starting DB Patch...")
    
    # Check listings
    safe_add_column(conn, "listings", "is_good_deal", "ALTER TABLE listings ADD COLUMN is_good_deal BOOLEAN DEFAULT 0")

    # Check products
    safe_add_column(conn, "products", "players", "ALTER TABLE products ADD COLUMN players TEXT")
    safe_add_column(conn, "products", "box_only_price", "ALTER TABLE products ADD COLUMN box_only_price FLOAT")
    
    # Check manual price & PC ID
    safe_add_column(conn, "products", "manual_only_price", "ALTER TABLE products ADD COLUMN manual_only_price FLOAT")
    # We can separate this one safely
    safe_add_column(conn, "products", "pricecharting_id", "ALTER TABLE products ADD COLUMN pricecharting_id INTEGER")

    # Phase 2: User Profile
    safe_add_column(conn, "users", "bio", "ALTER TABLE users ADD COLUMN bio TEXT")
    safe_add_column(conn, "users", "is_collection_public", "ALTER TABLE users ADD COLUMN is_collection_public BOOLEAN DEFAULT false")

    # Performance: Listings Index
    # CREATE INDEX IF NOT EXISTS works in PG > 9.5, safe to run directly generally.
    try:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_listings_price ON listings (price)"))
        print("Index 'ix_listings_price' checked/created.")
        conn.commit()
    except Exception as e:
        print(f"Index creation skipped/failed: {e}")
        conn.rollback()
    
    print("Patch Complete.")
