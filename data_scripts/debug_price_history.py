import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = "c:/Users/charl/collector/collector.db"

def check_price_history():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Count total rows
        cursor.execute("SELECT count(*) FROM price_history")
        count = cursor.fetchone()[0]
        print(f"Total PriceHistory rows: {count}")
        
        # Check recent
        recent = datetime.utcnow().date() - timedelta(days=30)
        cursor.execute("SELECT count(*) FROM price_history WHERE date >= ?", (recent,))
        recent_count = cursor.fetchone()[0]
        print(f"Rows in last 30 days: {recent_count}")
        
        # Sample
        cursor.execute("SELECT * FROM price_history ORDER BY date DESC LIMIT 5")
        rows = cursor.fetchall()
        print("Latest 5 rows:")
        for row in rows:
            print(row)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_price_history()
