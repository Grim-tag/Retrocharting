
import sys
import os

# Set up path to allow imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.product import Product

def check():
    db = SessionLocal()
    try:
        count = db.query(Product).filter(Product.console_name == "PC Games").count()
        print(f"PC Games Count: {count}")
        
        # Check first and last game to gauge range
        first = db.query(Product).filter(Product.console_name == "PC Games").order_by(Product.id.asc()).first()
        last = db.query(Product).filter(Product.console_name == "PC Games").order_by(Product.id.desc()).first()
        
        if first: print(f"First ID: {first.id}, Name: {first.product_name}")
        if last: print(f"Last ID: {last.id}, Name: {last.product_name}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check()
