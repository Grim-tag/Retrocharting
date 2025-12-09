import time
import random
import cloudinary
import cloudinary.uploader
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, and_
from datetime import datetime

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

import requests
from bs4 import BeautifulSoup

from app.models.scraper_log import ScraperLog

def scrape_missing_data(max_duration: int = 600, limit: int = 50):
    """
    Scrapes data for products with missing information.
    max_duration: seconds to run
    limit: items per batch
    """
    start_time = time.time()
    db: Session = SessionLocal()
    
    print(f"Starting scraper service. Max duration: {max_duration}s")
    
    # Create Log Entry
    log_entry = ScraperLog(status="running", items_processed=0, start_time=datetime.utcnow())
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    current_log_id = log_entry.id
    processed_count = 0
    
    try:
        while True:
            elapsed = time.time() - start_time
            if elapsed > max_duration:
                print(f"Time limit reached ({elapsed:.0f}s).")
                break
                
            # Logic: Missing Description OR Missing Publisher OR No Price History
            products = db.query(Product).outerjoin(PriceHistory).filter(
                or_(
                    Product.description == None, 
                    Product.description == "",
                    Product.publisher == None,
                    Product.publisher == "",
                    PriceHistory.id == None
                ),
                Product.console_name != None,
                Product.console_name != "",
                Product.product_name != None,
                Product.product_name != ""
            ).distinct().limit(limit).all()
            
            if not products:
                print("No incomplete products found.")
                break
            
            print(f"Fetched batch of {len(products)} games.")
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            for p in products:
                if time.time() - start_time > max_duration:
                    break

                if not p.console_name or not p.product_name:
                    continue

                # Construct URL
                console_slug = p.console_name.lower().replace(' ', '-')
                product_slug = p.product_name.lower().replace(' ', '-').replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
                while '--' in product_slug:
                    product_slug = product_slug.replace('--', '-')
                    
                url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
                # print(f"Scraping {p.product_name}...")
                
                try:
                    response = requests.get(url, headers=headers)
                    if response.status_code == 200:
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Data Extraction Logic (Same as before)
                        # 1. Image
                        if not p.image_url or "cloudinary" not in p.image_url:
                            img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                            if img and img.get('src') and "shim.gif" not in img.get('src'):
                                original_url = img.get('src')
                                try:
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
                                    chart_data = json.loads(json_str)
                                    
                                    for condition, points in chart_data.items():
                                        if not points: continue
                                        db_condition = condition
                                        if condition == "boxonly": db_condition = "box_only"
                                        if condition == "manualonly": db_condition = "manual_only"
                                        
                                        for point in points:
                                            ts = point[0]
                                            price = float(point[1])
                                            # Convert from ms to date
                                            date_obj = datetime.fromtimestamp(ts / 1000.0)
                                            
                                            exists_sql = "SELECT 1 FROM price_history WHERE product_id = :pid AND date = :date AND condition = :cond"
                                            result = db.execute(text(exists_sql), {"pid": p.id, "date": date_obj, "cond": db_condition}).fetchone()
                                            
                                            if not result:
                                                insert_sql = "INSERT INTO price_history (product_id, date, price, condition) VALUES (:pid, :date, :price, :cond)"
                                                db.execute(text(insert_sql), {"pid": p.id, "date": date_obj, "price": price, "cond": db_condition})
                                except Exception:
                                    pass
                        
                        # Update last_scraped
                        p.last_scraped = datetime.utcnow()
                        processed_count += 1
                        
                        # Update Log every item (or query less often if perf hits, but for 1 item/sec it's fine)
                        db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({"items_processed": processed_count})
                        
                        db.commit()
                    else:
                        print(f"  Failed: {response.status_code}")
                except Exception as e:
                    print(f"  Error: {e}")
                    
                time.sleep(random.uniform(0.5, 1.5))
            
            db.commit()
        
        # Mark as completed
        db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({
            "status": "completed", 
            "end_time": datetime.utcnow()
        })
        db.commit()

    except Exception as e:
        print(f"Global error: {e}")
        try:
            db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({
                "status": "error", 
                "error_message": str(e),
                "end_time": datetime.utcnow()
            })
            db.commit()
        except:
            pass
    finally:
        db.close()
        return processed_count
