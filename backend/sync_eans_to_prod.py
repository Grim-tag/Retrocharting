import sys
import os
import json
import psycopg2 # Use raw psycopg2 for simple bulk update if available, or sqlalchemy
from sqlalchemy import create_engine, text

# Usage: python sync_eans_to_prod.py

def sync():
    # 1. Load Data
    if not os.path.exists("eans_export.json"):
        print("Error: eans_export.json not found.")
        return

    with open("eans_export.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Loaded {len(data)} items to sync.")
    
    # 2. Connect to Prod
    # Try getting from env var or ask user input
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL environment variable not found.")
        print("Please enter the Production Database URL (e.g., postgres://user:pass@render...):")
        db_url = input("> ").strip()
        
    if not db_url:
        print("No URL provided. Aborting.")
        return

    # Fix for SQLAlchemy requiring postgresql:// instead of postgres://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print("Connecting to database...")
    engine = create_engine(db_url)
    
    updated_count = 0
    skipped_count = 0
    
    try:
        with engine.connect() as conn:
            # We will transactionally update
            with conn.begin():
                for item in data:
                    pid = item['pricecharting_id']
                    ean = item['ean']
                    
                    if not pid or not ean:
                        continue
                        
                    # Logic: Only update if EAN is currently NULL or empty
                    sql = text("""
                        UPDATE products 
                        SET ean = :ean 
                        WHERE pricecharting_id = :pid 
                          AND (ean IS NULL OR ean = '')
                    """)
                    
                    result = conn.execute(sql, {"ean": ean, "pid": pid})
                    if result.rowcount > 0:
                        updated_count += 1
                    else:
                        skipped_count += 1
                        
                    if (updated_count + skipped_count) % 100 == 0:
                        print(f"Processed {updated_count + skipped_count}...")
                        
            print(f"Sync Complete.")
            print(f"Updated: {updated_count}")
            print(f"Skipped (Already had EAN): {skipped_count}")
            
    except Exception as e:
        print(f"Sync Error: {e}")

if __name__ == "__main__":
    sync()
