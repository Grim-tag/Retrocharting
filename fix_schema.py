import sqlite3
import os

# Adjust path to your implementation
db_path = 'collector.db' 

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables found:", tables)
        
        print("Checking for image_blob column...")
        cursor.execute("SELECT image_blob FROM product LIMIT 1") # Try singular 'product'
        print("Column exists in 'product'.")
    except sqlite3.OperationalError as e:
        print(f"Error checking column: {e}")
        # If error was about NO TABLE, previous print handles it. 
        # If error is about no column, we try adding it to 'product' OR 'products' depending on list.
        print("Column missing. Adding image_blob...")
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN image_blob BLOB")
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Failed to add column: {e}")
    finally:
        conn.close()
else:
    print(f"Database not found at {db_path}")
