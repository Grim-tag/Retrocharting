import sqlite3
import os

DB_PATH = os.path.join("c:\\Users\\charl\\collector", "collector.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("Checking recent Amazon listings via SQL...")

try:
    print("Checking for PRODUCTS scraped today...")
    cursor.execute("SELECT product_name, console_name, last_scraped FROM products WHERE last_scraped >= datetime('now', '-18 hours') LIMIT 10")
    scraped_products = cursor.fetchall()
    
    if scraped_products:
        print(f"Found {len(scraped_products)} products processed by the bot:")
        for sp in scraped_products:
            print(f"- {sp[0]} ({sp[1]})")
    else:
        print("No products processed found.")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
