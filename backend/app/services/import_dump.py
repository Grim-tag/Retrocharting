import csv
import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.product import Product

def import_csv_dump():
    # Path to CSV
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data_scripts', 'products_dump.csv')
    
    if not os.path.exists(csv_path):
        print(f"CSV dump not found at {csv_path}")
        return

    print(f"Importing products from {csv_path}...")
    
    db: Session = SessionLocal()
    
    # Check if DB is empty to avoid duplicates or overwriting
    count = db.query(Product).count()
    if count > 0:
        print(f"Database already has {count} products. Skipping import.")
        return

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                # Convert empty strings to None for nullable fields if needed
                # But DictReader gives strings.
                
                # Handle numeric fields
                loose_price = float(row['loose_price']) if row['loose_price'] else None
                cib_price = float(row['cib_price']) if row['cib_price'] else None
                new_price = float(row['new_price']) if row['new_price'] else None
                
                product = Product(
                    id=row['id'], # Preserve ID
                    pricecharting_id=row['pricecharting_id'],
                    console_name=row['console_name'],
                    product_name=row['product_name'],
                    description=row['description'],
                    loose_price=loose_price,
                    cib_price=cib_price,
                    new_price=new_price,
                    genre=row['genre'],
                    image_url=row['image_url'],
                    publisher=row['publisher'],
                    developer=row['developer'],
                    esrb_rating=row['esrb_rating'],
                    players=row['players']
                )
                batch.append(product)
                
                if len(batch) >= 1000:
                    db.bulk_save_objects(batch)
                    db.commit()
                    batch = []
                    print(".", end="", flush=True)
            
            if batch:
                db.bulk_save_objects(batch)
                db.commit()
                
        print("\nImport complete.")
        
    except Exception as e:
        print(f"Error importing CSV: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_csv_dump()
