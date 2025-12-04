import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

import requests
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.product import Product

def verify_images():
    db: Session = SessionLocal()
    
    # Test known ID
    test_id = 3966 # 007 World Is Not Enough (N64)
    url = f"https://www.pricecharting.com/game_images/{test_id}.jpg"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    print(f"Checking known image for ID {test_id}...")
    try:
        response = requests.head(url, headers=headers)
        if response.status_code == 200:
            print(f"  [SUCCESS] Found: {url}")
        else:
            print(f"  [FAILED] Status {response.status_code}: {url}")
    except Exception as e:
        print(f"  [ERROR] {e}")

if __name__ == "__main__":
    verify_images()
