import csv
import os

csv_path = 'backend/app/data/products_dump.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    found_consoles = set()
    for row in reader:
        if 'PC' in row['console_name']:
            found_consoles.add(row['console_name'])
    
    print("Found consoles matching 'PC':")
    for c in sorted(found_consoles):
        print(f" - {c}")
