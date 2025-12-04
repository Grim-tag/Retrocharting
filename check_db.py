import sqlite3

try:
    conn = sqlite3.connect('collector.db')
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM products")
    count = cursor.fetchone()[0]
    print(f"Total products: {count}")
    
    if count > 0:
        cursor.execute("SELECT * FROM products LIMIT 1")
        print("Sample product:", cursor.fetchone())
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
