import sqlite3
import os

# Path to the database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def update_db():
    print(f"Connecting to database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Add is_good_deal to listings
    try:
        print("Adding column is_good_deal to listings...")
        cursor.execute("ALTER TABLE listings ADD COLUMN is_good_deal BOOLEAN DEFAULT 0")
        print("  Success.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("  Column is_good_deal already exists.")
        else:
            print(f"  Error adding is_good_deal: {e}")

    # 2. Add players to products (if missing)
    try:
        print("Adding column players to products...")
        cursor.execute("ALTER TABLE products ADD COLUMN players TEXT")
        print("  Success.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("  Column players already exists.")
        else:
            print(f"  Error adding players: {e}")

    conn.commit()
    conn.close()
    print("Database update complete.")

if __name__ == "__main__":
    update_db()
