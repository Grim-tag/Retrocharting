import sqlite3
import os

# Path to the database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def add_columns():
    print(f"Connecting to database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    columns = [
        ("description", "TEXT"),
        ("publisher", "TEXT"),
        ("developer", "TEXT"),
        ("esrb_rating", "TEXT"),
        ("players", "TEXT")
    ]

    for col_name, col_type in columns:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}")
            print(f"  Success.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"  Column {col_name} already exists.")
            else:
                print(f"  Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Database update complete.")

if __name__ == "__main__":
    add_columns()
