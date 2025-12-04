import sqlite3
import os

def find_id():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'collector.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT pricecharting_id, product_name, console_name FROM products WHERE product_name LIKE '%007 World is Not Enough%'")
    results = cursor.fetchall()
    
    for row in results:
        print(f"ID: {row[0]}, Name: {row[1]}, Console: {row[2]}")
        
    conn.close()

if __name__ == "__main__":
    find_id()
