import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def check_cross_platform():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Find product names that appear on multiple consoles
    sql = """
    SELECT product_name, COUNT(DISTINCT console_name) as console_count, GROUP_CONCAT(console_name)
    FROM products
    GROUP BY product_name
    HAVING console_count > 1
    LIMIT 10;
    """
    
    cursor.execute(sql)
    results = cursor.fetchall()
    
    print("Games found on multiple platforms:")
    for row in results:
        print(f"Name: {row[0]}")
        print(f"Count: {row[1]}")
        print(f"Consoles: {row[2]}")
        print("-" * 20)
        
    conn.close()

if __name__ == "__main__":
    check_cross_platform()
