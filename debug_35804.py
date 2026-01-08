import sqlite3
import os

db_path = "backend/app.db"
# If not found, try app.db in root (where settings usually point)
if not os.path.exists(db_path):
    if os.path.exists("app.db"):
        db_path = "app.db"
    else:
        print("Cannot find app.db")
        exit(1)

print(f"Checking DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, product_name, genre, game_slug FROM products WHERE id=35804")
    row = c.fetchone()
    if row:
        print(f"FOUND: ID={row[0]}, Name='{row[1]}', Genre='{row[2]}', GameSlug='{row[3]}'")
    else:
        print("NOT FOUND in DB")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
