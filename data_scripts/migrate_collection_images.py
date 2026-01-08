import sqlite3
import os

DB_PATH = "c:/Users/charl/collector/collector.db"

def migrate_collection_images():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Add user_images column
        try:
            cursor.execute("ALTER TABLE collection_items ADD COLUMN user_images TEXT")
            print("Added column 'user_images' to collection_items table.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("Column 'user_images' already exists.")
            else:
                print(f"Error adding 'user_images': {e}")

        conn.commit()
        print("Migration completed successfully.")
    
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_collection_images()
