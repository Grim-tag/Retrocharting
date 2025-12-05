import csv
import os

def check_csv():
    csv_path = 'backend/app/data/products_dump.csv'
    if not os.path.exists(csv_path):
        print(f"File not found: {csv_path}")
        return

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        print(f"Fieldnames: {reader.fieldnames}")
        
        count = 0
        for row in reader:
            if count < 5:
                print(f"Row {count}: console_name='{row.get('console_name')}'")
            count += 1
            
    print(f"Total rows: {count}")

if __name__ == "__main__":
    check_csv()
