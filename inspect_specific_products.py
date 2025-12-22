import sqlite3
import os

DB_PATH = os.path.join("c:\\Users\\charl\\collector", "collector.db")
IDS = [90704, 90705, 90707, 65575]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("--- Inspecting Products ---")
for pid in IDS:
    cursor.execute("SELECT id, product_name, console_name, last_scraped FROM products WHERE id = ?", (pid,))
    p = cursor.fetchone()
    if p:
        print(f"\nProduct ID: {p[0]}")
        print(f"Name: {p[1]}")
        print(f"Console: {p[2]}")
        print(f"Last Scraped: {p[3]}")
        
        print("  Listings:")
        cursor.execute("SELECT id, source, title, price, currency, last_updated, seller_name, url FROM listings WHERE product_id = ?", (pid,))
        listings = cursor.fetchall()
        if listings:
            for l in listings:
                print(f"    [{l[1]}] {l[2]} | {l[3]} {l[4]} | Updated: {l[5]}")
                print(f"      URL: {l[7][:50]}...")
        else:
            print("    No listings found.")
    else:
        print(f"\nProduct ID {pid} not found.")

conn.close()
