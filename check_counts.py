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
    
    if Console:
        console_count = db.query(Console).count()
        print(f"Total Consoles (Table): {console_count}")
    else:
        print("Console model not found.")
        
    # Check distinct consoles in Product
    distinct_consoles = db.query(Product.console_name).distinct().count()
    print(f"Distinct Console Names in Products: {distinct_consoles}")

if __name__ == "__main__":
    check_counts()
