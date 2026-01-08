import sqlite3
import os

DB_PATH = "c:/Users/charl/collector/collector.db"

def check_root_db_tables():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        print(f"Tables in Root DB: {tables}")
        
        if 'collection_items' in tables:
            print("collection_items exists.")
            # Check columns
            cursor.execute("PRAGMA table_info(collection_items)")
            cols = [r[1] for r in cursor.fetchall()]
            print(f"Columns: {cols}")
        else:
            print("collection_items MISSING.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_root_db_tables()
