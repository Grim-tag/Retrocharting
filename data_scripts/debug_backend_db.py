import sqlite3
import os
from datetime import datetime, timedelta

# TARGETING BACKEND DB NOW
DB_PATH = "c:/Users/charl/collector/backend/collector.db"

def check_backend_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check Tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"Tables in backend DB: {tables}")

        if 'price_history' in tables:
            cursor.execute("SELECT count(*) FROM price_history")
            count = cursor.fetchone()[0]
            print(f"PriceHistory rows: {count}")
        else:
            print("PriceHistory table MISSING!")

        if 'collection_items' in tables:
            # Check for user_images column
            cursor.execute("PRAGMA table_info(collection_items)")
            cols = [r[1] for r in cursor.fetchall()]
            print(f"CollectionItem columns: {cols}")
        else:
            print("collection_items table MISSING!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_backend_db()
