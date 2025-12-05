import csv
import os
import sys
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_path)

from app.db.session import SessionLocal
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.models.listing import Listing

# Load .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

if not os.environ.get("DATABASE_URL"):
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'collector.db')
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

def export_to_csv():
    db = SessionLocal()
    
    # Export Products
    print("Exporting products...")
    products = db.query(Product).all()
    with open('data_scripts/products_dump.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Write header
        writer.writerow(['id', 'pricecharting_id', 'console_name', 'product_name', 'description', 'loose_price', 'cib_price', 'new_price', 'genre', 'image_url', 'publisher', 'developer', 'esrb_rating', 'players'])
        for p in products:
            writer.writerow([p.id, p.pricecharting_id, p.console_name, p.product_name, p.description, p.loose_price, p.cib_price, p.new_price, p.genre, p.image_url, p.publisher, p.developer, p.esrb_rating, p.players])
            
    # Export PriceHistory (might be large, let's see)
    # print("Exporting price history...")
    # history = db.query(PriceHistory).all()
    # with open('data_scripts/history_dump.csv', 'w', newline='', encoding='utf-8') as f:
    #     writer = csv.writer(f)
    #     writer.writerow(['id', 'product_id', 'date', 'price', 'condition'])
    #     for h in history:
    #         writer.writerow([h.id, h.product_id, h.date, h.price, h.condition])
            
    print("Export complete.")

if __name__ == "__main__":
    export_to_csv()
