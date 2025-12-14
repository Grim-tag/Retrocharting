import sqlite3

def check_descriptions():
    try:
        conn = sqlite3.connect('collector.db')
        c = conn.cursor()
        
        # Total items
        c.execute('SELECT count(*) FROM product')
        total = c.fetchone()[0]
        
        # Items with descriptions
        c.execute('SELECT count(*) FROM product WHERE description IS NOT NULL AND description != "" AND description != "No description available."')
        with_desc = c.fetchone()[0]
        
        print(f"Total Products: {total}")
        print(f"Products with Descriptions: {with_desc}")
        print(f"Coverage: {(with_desc/total)*100:.2f}%")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_descriptions()
