import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.core.config import settings
import time
import random
import cloudinary
import cloudinary.uploader
import json
from datetime import datetime

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

def get_session():
    session = requests.Session()
    session.headers.update({
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://www.google.com/",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1"
    })
    return session

def scrape_products(limit: int = 50):
    db: Session = SessionLocal()
    session = get_session()
    
    try:
        # Get products without description OR without price history
        products = db.query(Product).outerjoin(PriceHistory).filter(
            or_(Product.description == None, PriceHistory.id == None),
            Product.console_name != None,
            Product.console_name != "",
            Product.product_name != None,
            Product.product_name != ""
        ).distinct().limit(limit).all()
        
        print(f"Found {len(products)} games to scrape details for.")
        
        count = 0
        for p in products:
            if not p.console_name or not p.product_name:
                continue

            # Rotate User-Agent
            session.headers.update({"User-Agent": random.choice(USER_AGENTS)})

            # Construct URL
            console_slug = p.console_name.lower().replace(' ', '-')
            product_slug = p.product_name.lower().replace(' ', '-').replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
            while '--' in product_slug: product_slug = product_slug.replace('--', '-')
                
            url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
            print(f"[{count+1}/{len(products)}] Scraping {p.product_name} ({url})...")
            
            try:
                response = session.get(url, timeout=10)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # 1. Image
                    if not p.image_url or "cloudinary" not in p.image_url:
                        img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                        if img and img.get('src') and "shim.gif" not in img.get('src'):
                            original_url = img.get('src')
                            try:
                                upload_result = cloudinary.uploader.upload(original_url, folder="retrocharting/products")
                                p.image_url = upload_result['secure_url']
                            except Exception as e:
                                print(f"  Image upload failed: {e}")
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
                            elif "UPC:" in key: 
                                p.ean = value.replace("edit", "").strip()
                                p.gtin = p.ean
                            elif "EAN:" in key:
                                p.ean = value.replace("edit", "").strip() 
                                p.gtin = p.ean
                            elif "GTIN:" in key:
                                p.gtin = value.replace("edit", "").strip()
                                if not p.ean: p.ean = p.gtin 
                            elif "Description:" in key: p.description = value.strip()

                    # 4. Price History
                    scripts = soup.find_all('script')
                    for script in scripts:
                        if script.string and "VGPC.chart_data" in script.string:
                            try:
                                start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
                                end_index = script.string.find(";", start_index)
                                json_str = script.string[start_index:end_index].strip() if end_index != -1 else script.string[start_index:].strip()
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
                                        
                                        # Optimization: We could cache existing checks, but simple check is okay for now
                                        exists_sql = "SELECT 1 FROM price_history WHERE product_id = :pid AND date = :date AND condition = :cond"
                                        result = db.execute(text(exists_sql), {"pid": p.id, "date": date_obj, "cond": db_condition}).fetchone()
                                        
                                        if not result:
                                            insert_sql = "INSERT INTO price_history (product_id, date, price, condition) VALUES (:pid, :date, :price, :cond)"
                                            db.execute(text(insert_sql), {"pid": p.id, "date": date_obj, "price": price, "cond": db_condition})
                            except Exception as e:
                                print(f"  Chart parse error: {e}")

                else:
                    print(f"  Failed: {response.status_code}")
            except Exception as e:
                print(f"  Request error: {e}")
                
            count += 1
            
            # Commit in batches of 5 to reduce I/O but ensure progress is saved
            if count % 5 == 0:
                db.commit()
                print(f"  Committed batch of 5.")
                
            # Random delay (Optimized for speed while safe-ish)
            time.sleep(random.uniform(0.5, 1.5))
            
        # Final commit
        db.commit()
        print("Batch complete.")
            
    except Exception as e:
        print(f"Scraper error: {e}")
        db.rollback()
    finally:
        db.close()
