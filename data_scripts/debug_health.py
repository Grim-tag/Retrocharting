import os
import sys

# Debug paths
print(f"CWD: {os.getcwd()}")
# Assuming we run from project root, .env is in backend/.env or root .env?
# config.py says: _project_root/.env
# Let's try root .env first, then backend/.env
env_paths = [
    os.path.abspath(os.path.join(os.getcwd(), '.env')),
    os.path.abspath(os.path.join(os.getcwd(), 'backend', '.env'))
]
found_env = False
for env_path in env_paths:
    if os.path.exists(env_path):
        print(f"Found .env file at {env_path}. Parsing manually...")
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    os.environ[key] = value
                    # print(f"Loaded: {key}")
        found_env = True
        break

if not found_env:
    print("ERROR: .env file NOT FOUND in likely locations!")

# Mock missing keys to satisfy Pydantic
required_mock_keys = [
    "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL", 
    "EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_USER_TOKEN", "SERPAPI_KEY",
    "PRICECHARTING_API_TOKEN" # we might need this one but mock if missing just to load db
]
for key in required_mock_keys:
    if key not in os.environ:
        print(f"Mocking missing key: {key}")
        os.environ[key] = "mock_value"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.db.session import SessionLocal
# Import ALL models that Product depends on
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.sales_transaction import SalesTransaction
from sqlalchemy import or_

def check_data():
    db = SessionLocal()
    try:
        # Check totals
        total = db.query(Product).count()
        print(f"Total Products: {total}")

        # Check NULLs
        null_images = db.query(Product).filter(Product.image_url == None).count()
        null_desc = db.query(Product).filter(Product.description == None).count()
        print(f"NULL Images: {null_images}")
        print(f"NULL Descriptions: {null_desc}")

        # Check Empty Strings
        empty_images = db.query(Product).filter(Product.image_url == "").count()
        empty_desc = db.query(Product).filter(Product.description == "").count()
        print(f"Empty String Images: {empty_images}")
        print(f"Empty String Descriptions: {empty_desc}")

        # Check 'None' string (artifact of bad import?)
        str_none_images = db.query(Product).filter(Product.image_url == "None").count()
        print(f"'None' String Images: {str_none_images}")

        # Sample some 'valid' ones to see what they look like if count is high
        print("\nSample of 'valid' descriptions:")
        samples = db.query(Product.description).filter(Product.description != None).limit(5).all()
        for s in samples:
            print(f"- '{s[0]}'")

        # Descriptions are already checked above
        
        # Check Details (Publisher / Developer)
        missing_publisher = db.query(Product).filter(or_(Product.publisher == None, Product.publisher == "")).count()
        missing_developer = db.query(Product).filter(or_(Product.developer == None, Product.developer == "")).count()
        print(f"Missing Publisher: {missing_publisher}")
        print(f"Missing Developer: {missing_developer}")

        # Check Price History (Products with NO history points)
        # This is heavy if done naively. Use NOT EXISTS.
        from sqlalchemy import exists, text
        
        # Products that do NOT have any price history
        # SQL: SELECT count(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM price_history ph WHERE ph.product_id = p.id)
        
        products_without_history = db.query(Product).filter(~exists().where(PriceHistory.product_id == Product.id)).count()
        print(f"Products with NO Price History: {products_without_history}")

    finally:
        db.close()

if __name__ == "__main__":
    check_data()
