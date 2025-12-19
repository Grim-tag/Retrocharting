import csv
import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.user import User
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.collection_item import CollectionItem
from app.models.comment import Comment
from app.models.sniper import SniperResult
from app.models.sales_transaction import SalesTransaction
from app.models.product import Product

def import_csv_dump():
    # Path to CSV: backend/app/data/products_dump.csv
    # __file__ = backend/app/services/import_dump.py
    # dirname 1 = backend/app/services
    # dirname 2 = backend/app
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(app_dir, 'data', 'products_dump.csv')
    
    if not os.path.exists(csv_path):
        print(f"CSV dump not found at {csv_path}")
        return

    print(f"Importing products from {csv_path}...")
    
    db: Session = SessionLocal()
    
    # Batch fetch existing IDs to avoid N+1 and allow incremental updates
    existing_ids = {id_[0] for id_ in db.query(Product.id).all()}
    print(f"Database contains {len(existing_ids)} products. Checking for new items...")

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            batch = []
            new_count = 0
            
            for row in reader:
                p_id = int(row['id'])
                if p_id in existing_ids:
                    continue
                    
                # Convert empty strings to None for nullable fields if needed
                # But DictReader gives strings.
                
                # Handle numeric fields
                loose_price = float(row['loose_price']) if row['loose_price'] else None
                cib_price = float(row['cib_price']) if row['cib_price'] else None
                new_price = float(row['new_price']) if row['new_price'] else None
                
                product = Product(
                    id=p_id, # Preserve ID
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
                new_count += 1
                
                if len(batch) >= 1000:
                    db.bulk_save_objects(batch)
                    db.commit()
                    batch = []
                    print(".", end="", flush=True)
            
            if batch:
                db.bulk_save_objects(batch)
                db.commit()
                
        print(f"\nImport complete. Added {new_count} new products.")
        
    except Exception as e:
        print(f"Error importing CSV: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_csv_dump()
