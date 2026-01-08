import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def create_table():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create price_history table
    sql = """
    CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        date DATE,
        price FLOAT,
        condition VARCHAR,
        FOREIGN KEY(product_id) REFERENCES products(id)
    );
    """
    cursor.execute(sql)
    
    # Create index on product_id
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_price_history_product_id ON price_history (product_id);")
    
    conn.commit()
    print("Created price_history table.")
    conn.close()

if __name__ == "__main__":
    create_table()
