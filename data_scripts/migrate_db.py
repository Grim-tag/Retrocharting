import sys
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

from app.db.session import Base
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.models.listing import Listing

# Local SQLite
SQLITE_URL = "sqlite:///collector.db"
sqlite_engine = create_engine(SQLITE_URL)
SQLiteSession = sessionmaker(bind=sqlite_engine)

# Remote PostgreSQL
# Use the URL provided by the user
POSTGRES_URL = "postgresql://retrocharting_db_user:wkgDPzv2cdhNWuzeu8oCrlxT3TruPAw8@dpg-d4onr2fgi27c738kvsh0-a.frankfurt-postgres.render.com/retrocharting_db"
# Note: Render internal URL is usually for internal use. External access needs the external URL.
# But let's try this one. If it fails, we might need the external one or run this from a deployed script?
# Wait, the user usually gives the internal one which works if we are inside Render.
# For local migration, we need the EXTERNAL URL.
# However, Render often provides one URL. Let's try to use it.
# If it's an internal URL (dpg-...), it might not resolve locally.
# Let's try. If it fails, we'll ask for the external URL.
# Actually, the URL provided "dpg-d4onr2fgi27c738kvsh0-a" looks like an internal hostname.
# External hostnames usually end in `.render.com` but have a different prefix or same.
# Let's try appending `.frankfurt-postgres.render.com` if it's missing?
# The user gave: postgresql://retrocharting_db_user:wkgDPzv2cdhNWuzeu8oCrlxT3TruPAw8@dpg-d4onr2fgi27c738kvsh0-a/retrocharting_db
# This is definitely the INTERNAL URL.
# I will try to guess the external one or ask the user.
# External URL usually has the same ID but might be different.
# Let's try to run it. If it fails, I will notify the user.

# Update: I will use the provided URL but I suspect it won't work locally.
# I'll try to add `.frankfurt-postgres.render.com` to the host if it's just the ID.
# The host is `dpg-d4onr2fgi27c738kvsh0-a`.
# Let's try to connect.

pg_engine = create_engine(POSTGRES_URL)
PgSession = sessionmaker(bind=pg_engine)

def migrate():
    print("Connecting to SQLite...")
    sqlite_session = SQLiteSession()
    
    print("Connecting to PostgreSQL...")
    try:
        # Create tables
        print("Creating tables in PostgreSQL...")
        Base.metadata.create_all(pg_engine)
        
        # Truncate tables to ensure clean state
        print("Truncating tables...")
        with pg_engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("TRUNCATE TABLE listings, price_history, products RESTART IDENTITY CASCADE"))
            conn.commit()
            print("Tables truncated.")
            
    except Exception as e:
        print(f"Failed to connect/create tables in Postgres: {e}")
        print("Make sure you are using the EXTERNAL Database URL if running locally.")
        return

    pg_session = PgSession()
    
    # Migrate Products
    print("Migrating Products...")
    products = sqlite_session.query(Product).all()
    print(f"Found {len(products)} products.")
    
    # Bulk insert is faster, but let's do it safely
    # We need to detach objects from sqlite session to attach to pg session
    # Or just create new objects.
    # Creating new objects is safer to avoid session conflicts.
    
    # Bulk insert using mappings
    print("Preparing bulk insert for products...")
    product_mappings = []
    total_count = 0
    for p in products:
        # ... (mapping logic)
        product_mappings.append({
            "id": p.id,
            # ...
            "players": p.players
        })
        
        if len(product_mappings) >= 5000:
            print(f"  Inserting batch of {len(product_mappings)} products...")
            pg_session.bulk_insert_mappings(Product, product_mappings)
            pg_session.commit()
            total_count += len(product_mappings)
            product_mappings = []
            
    if product_mappings:
        print(f"  Inserting final batch of {len(product_mappings)} products...")
        pg_session.bulk_insert_mappings(Product, product_mappings)
        pg_session.commit()
        total_count += len(product_mappings)
    print(f"Products migrated. Total: {total_count}")
    
    # Migrate PriceHistory
    print("Migrating PriceHistory...")
    history = sqlite_session.query(PriceHistory).all()
    print(f"Found {len(history)} history records.")
    
    # Bulk insert for PriceHistory
    print("Preparing bulk insert for PriceHistory...")
    history_mappings = []
    total_count = 0
    for h in history:
        history_mappings.append({
            "product_id": h.product_id,
            "date": h.date,
            "price": h.price,
            "condition": h.condition
        })
        
        if len(history_mappings) >= 10000:
            print(f"  Inserting batch of {len(history_mappings)} history records...")
            pg_session.bulk_insert_mappings(PriceHistory, history_mappings)
            pg_session.commit()
            total_count += len(history_mappings)
            history_mappings = []
            
    if history_mappings:
        print(f"  Inserting final batch of {len(history_mappings)} history records...")
        pg_session.bulk_insert_mappings(PriceHistory, history_mappings)
        pg_session.commit()
        total_count += len(history_mappings)
    print(f"PriceHistory migrated. Total: {total_count}")

    # Migrate Listings
    print("Migrating Listings...")
    listings = sqlite_session.query(Listing).all()
    print(f"Found {len(listings)} listings.")
    
    # Bulk insert for Listings
    print("Preparing bulk insert for Listings...")
    listing_mappings = []
    total_count = 0
    for l in listings:
        listing_mappings.append({
            "product_id": l.product_id,
            "source": l.source,
            "external_id": l.external_id,
            "title": l.title,
            "price": l.price,
            "currency": l.currency,
            "condition": l.condition,
            "url": l.url,
            "image_url": l.image_url,
            "seller_name": l.seller_name,
            "status": l.status,
            "last_updated": l.last_updated
        })
        
        if len(listing_mappings) >= 5000:
            print(f"  Inserting batch of {len(listing_mappings)} listings...")
            pg_session.bulk_insert_mappings(Listing, listing_mappings)
            pg_session.commit()
            total_count += len(listing_mappings)
            listing_mappings = []
            
    if listing_mappings:
        print(f"  Inserting final batch of {len(listing_mappings)} listings...")
        pg_session.bulk_insert_mappings(Listing, listing_mappings)
        pg_session.commit()
        total_count += len(listing_mappings)
    print(f"Listings migrated. Total: {total_count}")
    
    print("Migration Complete!")

if __name__ == "__main__":
    migrate()
