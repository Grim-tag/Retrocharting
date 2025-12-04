import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# Force absolute path to the correct DB BEFORE importing app
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')
os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
print(f"Forcing DATABASE_URL to: {os.environ['DATABASE_URL']}")

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.product import Product
import time
import random

def scrape_images():
    db: Session = SessionLocal()
    
    print(f"Connected to DB at: {db_path}")
    
    # Get ALL products without image_url
    products = db.query(Product).filter(
        Product.image_url == None
    ).all()
    
    print(f"Found {len(products)} total games to scrape.")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    count = 0
    for p in products:
        # Construct URL: https://www.pricecharting.com/game/{console-slug}/{product-slug}
        # Need to slugify console and product name
        console_slug = p.console_name.lower().replace(' ', '-')
        
        # Handle special chars in product name: replace spaces with dashes, remove special chars
        # KEEP APOSTROPHES AND AMPERSANDS!
        product_slug = p.product_name.lower().replace(' ', '-').replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
        
        # Remove double dashes
        while '--' in product_slug:
            product_slug = product_slug.replace('--', '-')
            
        url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
        print(f"[{count+1}/{len(products)}] Scraping {p.product_name} ({url})...")
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                # Try to find image
                img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                if img and img.get('src'):
                    image_url = img.get('src')
                    # Check if it's the placeholder
                    if "shim.gif" in image_url:
                         print("  Found placeholder only.")
                    else:
                        print(f"  SUCCESS: Found image.")
                        p.image_url = image_url
                        db.commit()
                else:
                    print("  No image found on page.")
            else:
                print(f"  Failed to load page: {response.status_code} ({url})")
        except Exception as e:
            print(f"  Error: {e}")
            
        count += 1
        time.sleep(random.uniform(0.5, 1.5)) # Be polite but faster

if __name__ == "__main__":
    scrape_images()
