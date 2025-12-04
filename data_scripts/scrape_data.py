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
# Only if DATABASE_URL is not set (local dev)
if not os.environ.get("DATABASE_URL"):
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    print(f"Forcing DATABASE_URL to: {os.environ['DATABASE_URL']}")

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
import time
import random
import cloudinary
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

def scrape_data():
    start_time = time.time()
    MAX_DURATION = 12 * 60  # Run for 12 minutes max
    BATCH_SIZE = 50
    
    print(f"Starting scraper job. Max duration: {MAX_DURATION}s")
    
    db: Session = SessionLocal()
    
    try:
        while True:
            # Check time limit
            elapsed = time.time() - start_time
            if elapsed > MAX_DURATION:
                print(f"Time limit reached ({elapsed:.0f}s). Stopping for now.")
                break
                
            # Get products without description OR without price history
            from sqlalchemy import or_
            
            # Fetch a batch
            products = db.query(Product).outerjoin(PriceHistory).filter(
                or_(Product.description == None, PriceHistory.id == None),
                Product.console_name != None,
                Product.console_name != "",
                Product.product_name != None,
                Product.product_name != ""
            ).distinct().limit(BATCH_SIZE).all()
            
            if not products:
                print("No more products to scrape! Job finished.")
                break
            
            print(f"Fetched batch of {len(products)} games.")
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            for p in products:
                # Check time again inside the batch loop
                if time.time() - start_time > MAX_DURATION:
                    break

                if not p.console_name or not p.product_name:
                    continue

                # Construct URL
                console_slug = p.console_name.lower().replace(' ', '-')
                product_slug = p.product_name.lower().replace(' ', '-').replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
                
                while '--' in product_slug:
                    product_slug = product_slug.replace('--', '-')
                    
                url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
                print(f"Scraping {p.product_name}...")
                
                try:
                    response = requests.get(url, headers=headers)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # 1. Image
                        if not p.image_url or "cloudinary" not in p.image_url:
                            img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                            if img and img.get('src') and "shim.gif" not in img.get('src'):
                                original_url = img.get('src')
                                try:
                                    import cloudinary.uploader
                                    upload_result = cloudinary.uploader.upload(original_url, folder="retrocharting/products")
                                    p.image_url = upload_result['secure_url']
                                except Exception:
                                    p.image_url = original_url

                        # 2. Description
                        desc_elem = soup.select_one('#product_description')
                        if desc_elem:
                            p.description = desc_elem.get_text(strip=True).replace("Description:", "").strip()

                        # 3. Details
                        for tr in soup.select('tr'):
                            tds = tr.select('td')
                            if len(tds) >= 2:
                                key = tds[0].get_text(strip=True)
                                value = tds[1].get_text(strip=True)
                                
                                if "Genre:" in key: p.genre = value.replace("edit", "").strip()
                                elif "Publisher:" in key: p.publisher = value.replace("edit", "").strip()
                                elif "Developer:" in key: p.developer = value.replace("edit", "").strip()
                                elif "ESRB Rating:" in key: p.esrb_rating = value.replace("edit", "").strip()
                                elif "Player Count:" in key: p.players = value.replace("edit", "").strip()
                                elif "Description:" in key: p.description = value.strip()

                        # 4. Price History
                        scripts = soup.find_all('script')
                        for script in scripts:
                            if script.string and "VGPC.chart_data" in script.string:
                                try:
                                    start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
                                    end_index = script.string.find(";", start_index)
                                    if end_index == -1:
                                        json_str = script.string[start_index:].strip()
                                    else:
                                        json_str = script.string[start_index:end_index].strip()
                                    
                                    import json
                                    from datetime import datetime
                                    chart_data = json.loads(json_str)
                                    
                                    for condition, points in chart_data.items():
                                        if not points: continue
                                        db_condition = condition
                                        if condition == "boxonly": db_condition = "box_only"
                                        if condition == "manualonly": db_condition = "manual_only"
                                        
                                        for point in points:
                                            ts = point[0]
                                            price = float(point[1])
                                            date_obj = datetime.fromtimestamp(ts / 1000.0).date()
                                            
                                            exists_sql = "SELECT 1 FROM price_history WHERE product_id = :pid AND date = :date AND condition = :cond"
                                            result = db.execute(text(exists_sql), {"pid": p.id, "date": date_obj, "cond": db_condition}).fetchone()
                                            
                                            if not result:
                                                insert_sql = "INSERT INTO price_history (product_id, date, price, condition) VALUES (:pid, :date, :price, :cond)"
                                                db.execute(text(insert_sql), {"pid": p.id, "date": date_obj, "price": price, "cond": db_condition})
                                except Exception:
                                    pass

                        db.commit()
                    else:
                        print(f"  Failed: {response.status_code}")
                except Exception as e:
                    print(f"  Error: {e}")
                    
                time.sleep(random.uniform(0.5, 1.5))
            
            # Commit after batch (though we commit per item above for safety, this is fine)
            db.commit()
            
    except Exception as e:
        print(f"Global error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    scrape_data()
