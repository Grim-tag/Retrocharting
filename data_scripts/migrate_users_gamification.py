import sqlite3
import os

DB_PATH = "c:/Users/charl/collector/collector.db"

def migrate_users():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Add rank column
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN rank TEXT DEFAULT 'Loose'")
            print("Added column 'rank' to users table.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("Column 'rank' already exists.")
            else:
                print(f"Error adding 'rank': {e}")

        # Add xp column
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0")
            print("Added column 'xp' to users table.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("Column 'xp' already exists.")
            else:
                print(f"Error adding 'xp': {e}")

        # Add last_active column
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN last_active TIMESTAMP")
            print("Added column 'last_active' to users table.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print("Column 'last_active' already exists.")
            else:
                print(f"Error adding 'last_active': {e}")

        conn.commit()
        print("Migration completed successfully.")
    
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_users()
