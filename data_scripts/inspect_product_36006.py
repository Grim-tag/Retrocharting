
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Get database URL from env
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set.")
    sys.exit(1)

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def inspect_product(product_id):
    db = SessionLocal()
    try:
        # Get Product
        query = text("SELECT id, product_name, description, listing_count FROM products WHERE id = :id")
        result = db.execute(query, {"id": product_id}).fetchone()
        
        if result:
            print(f"Product ID: {result.id}")
            print(f"Name: {result.product_name}")
            print(f"Description Length: {len(result.description) if result.description else 0}")
            print(f"Description Preview: {(result.description or '')[:100]}...")
        else:
            print(f"Product {product_id} not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_product(36006)
