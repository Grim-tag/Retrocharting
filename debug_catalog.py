
import requests
import sqlite3
import os
import sys

# DB Check
try:
    db_path = os.path.join(os.path.dirname(__file__), "collector.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM products")
    count = cursor.fetchone()[0]
    print(f"DATABASE CHECK: Found {count} products in DB.")
    
    cursor.execute("SELECT id, product_name, asin FROM products LIMIT 5")
    rows = cursor.fetchall()
    print("Sample Rows:")
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print(f"DB Error: {e}")

# API Check
try:
    # Try localhost default
    url = "http://127.0.0.1:8000/api/v1/products?limit=5"
    print(f"API CHECK: Requesting {url}...")
    res = requests.get(url, timeout=5)
    print(f"API Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        print(f"API returned {len(data)} items.")
    else:
        print(f"API Content: {res.text[:200]}")
except Exception as e:
    print(f"API Error: {e}")
