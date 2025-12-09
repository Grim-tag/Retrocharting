import sqlite3

def check_db():
    try:
        conn = sqlite3.connect('collector.db')
        cursor = conn.cursor()
        
        # Check listings table info
        print("--- Table: listings ---")
        cursor.execute("PRAGMA table_info(listings)")
        columns = cursor.fetchall()
        found = False
        for col in columns:
            print(col)
            if col[1] == 'is_good_deal':
                found = True
        
        if found:
            print("\nSUCCESS: 'is_good_deal' column found in 'listings'.")
        else:
            print("\nFAILURE: 'is_good_deal' column NOT found in 'listings'.")
            
        print("\n--- Table: products ---")
        cursor.execute("PRAGMA table_info(products)")
        columns = cursor.fetchall()
        for col in columns:
            if col[1] == 'players':
                print(f"Found 'players' column: {col}")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
