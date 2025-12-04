import sqlite3
import os

def merge_db():
    # Paths
    dest_db = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'collector.db'))
    source_db = os.path.abspath(os.path.join(os.path.dirname(__file__), 'collector.db'))
    
    print(f"Destination: {dest_db}")
    print(f"Source: {source_db}")
    
    if not os.path.exists(source_db):
        print("Source DB not found!")
        return

    try:
        conn = sqlite3.connect(dest_db)
        cursor = conn.cursor()
        
        # Attach source
        cursor.execute(f"ATTACH DATABASE '{source_db}' AS source_db")
        
        # Check if products table exists in dest
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
        if not cursor.fetchone():
            print("Destination table 'products' does not exist. Creating...")
            # Copy schema from source
            cursor.execute("SELECT sql FROM source_db.sqlite_master WHERE type='table' AND name='products'")
            schema = cursor.fetchone()[0]
            cursor.execute(schema)
        
        # Copy data
        print("Copying data...")
        cursor.execute("INSERT OR REPLACE INTO main.products SELECT * FROM source_db.products")
        conn.commit()
        
        print(f"Merged {cursor.rowcount} rows.")
        
        conn.close()
        print("Merge complete.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    merge_db()
