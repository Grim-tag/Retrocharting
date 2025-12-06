import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

if not os.environ.get("DATABASE_URL"):
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'collector.db')
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
# Assuming Console model exists, if not we check distinct console_name in Product
# Checking for Console model import...
try:
    from app.models.console import Console
except ImportError:
    Console = None

def check_counts():
    db = SessionLocal()
    product_count = db.query(Product).count()
    print(f"Total Products: {product_count}")
    
    products_with_images = db.query(Product).filter(Product.image_url.isnot(None)).count()
    print(f"Products with Images: {products_with_images} ({products_with_images/product_count*100:.2f}%)")

    products_with_desc = db.query(Product).filter(Product.description.isnot(None)).count()
    print(f"Products with Descriptions: {products_with_desc} ({products_with_desc/product_count*100:.2f}%)")

    history_count = db.query(PriceHistory).count()
    print(f"Total Price History Points: {history_count}")

    # Check distinct consoles in Product
    distinct_consoles = db.query(Product.console_name).distinct().count()
    print(f"Distinct Console Names in Products: {distinct_consoles}")

if __name__ == "__main__":
    check_counts()
