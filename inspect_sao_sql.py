import sqlite3

conn = sqlite3.connect('collector.db')
cursor = conn.cursor()

ids = (92386, 67013, 27953)
query = "SELECT id, pricecharting_id, product_name, console_name FROM products WHERE product_name LIKE '%Sword Art Online%Last Recollection%'"

cursor.execute(query)
results = cursor.fetchall()

print(f"{'ID':<8} | {'PC_ID':<8} | {'PRODUCT NAME':<60} | {'CONSOLE NAME':<30}")
print("-" * 120)
for r in results:
    print(f"{r[0]:<8} | {r[1]:<8} | {r[2]:<60} | {r[3]:<30}")

conn.close()
