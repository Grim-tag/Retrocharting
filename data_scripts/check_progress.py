
import os
from dotenv import load_dotenv

# Debug paths
print(f"CWD: {os.getcwd()}")
env_path = os.path.abspath(os.path.join(os.getcwd(), 'backend', '.env'))
print(f"Loading .env from: {env_path}")

if os.path.exists(env_path):
    print("Found .env file. Parsing manually...")
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ[key] = value
                print(f"Loaded: {key}")
else:
    print("ERROR: .env file NOT FOUND!")

# No longer using load_dotenv
# load_dotenv(env_path)

# Mock missing keys to satisfy Pydantic
required_keys = [
    "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
    "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"
]
for key in required_keys:
    if key not in os.environ:
        print(f"Mocking missing key: {key}")
        os.environ[key] = "mock_value"

from app.db.session import SessionLocal
from sqlalchemy import text

def check_progress():
    db = SessionLocal()
    try:
        # Raw SQL to avoid ORM mapper errors
        total_products = db.execute(text("SELECT count(*) FROM products")).scalar()
        detailed_products = db.execute(text("SELECT count(*) FROM products WHERE description IS NOT NULL")).scalar()
        images_products = db.execute(text("SELECT count(*) FROM products WHERE image_url IS NOT NULL")).scalar()
        
        # Check if price_history table exists first (handling potential migration lags)
        try:
             total_history = db.execute(text("SELECT count(*) FROM price_history")).scalar()
        except:
             total_history = 0
        
        print(f"Total Products: {total_products}")
        print(f"Products with Descriptions: {detailed_products} ({detailed_products/total_products*100:.1f}%)" if total_products else "No Products")
        print(f"Products with Images: {images_products} ({images_products/total_products*100:.1f}%)" if total_products else "No Products")
        print(f"Total Price History Points: {total_history}")
        
        remaining = total_products - detailed_products if total_products else 0
        print(f"Remaining: {remaining}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_progress()
