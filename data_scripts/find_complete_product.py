import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def find_complete_product():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Find products with image and description
    # And also check if they have price history
    sql = """
    SELECT p.id, p.product_name, p.console_name, p.image_url, p.description, COUNT(ph.id) as history_count
    FROM products p
    LEFT JOIN price_history ph ON p.id = ph.product_id
    WHERE p.image_url IS NOT NULL AND p.image_url != ''
    AND p.description IS NOT NULL AND p.description != ''
    GROUP BY p.id
    HAVING history_count > 0
    LIMIT 5;
    """
    
    cursor.execute(sql)
    results = cursor.fetchall()
    
    if not results:
        print("No fully complete products found (with history).")
        # Fallback: just image and description
        print("Searching for products with just image and description...")
        sql_fallback = """
        SELECT id, product_name, console_name, image_url, description
        FROM products
        WHERE image_url IS NOT NULL AND image_url != ''
        AND description IS NOT NULL AND description != ''
        LIMIT 5;
        """
        cursor.execute(sql_fallback)
        results = cursor.fetchall()
    
    for row in results:
        print(f"ID: {row[0]}")
        print(f"Name: {row[1]}")
        print(f"Console: {row[2]}")
        if len(row) > 5:
            print(f"History Points: {row[5]}")
        print("-" * 20)
        
    conn.close()

if __name__ == "__main__":
    find_complete_product()
