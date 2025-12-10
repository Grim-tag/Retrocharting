import time
import random
import cloudinary
import cloudinary.uploader
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, and_
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import json

from app.db.session import SessionLocal
from app.db.session import SessionLocal
# Models imported inside functions to prevent circular imports
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

async def scrape_single_product(db: Session, product: "Product"):
    """
    Scrapes a single product given its DB object.
    Updates the object in place (does not commit).
    Async wrapper for potential future async usage, but currently uses blocking requests.
    """
    return _scrape_product_logic(db, product)

def scrape_missing_data(max_duration: int = 600, limit: int = 50):
    """
    Scrapes data for products with missing information.
    max_duration: seconds to run
    limit: items per batch
    """
    start_time = time.time()
    db: Session = SessionLocal()
    
    print(f"Starting scraper service. Max duration: {max_duration}s")
    
    from app.models.product import Product
    from app.models.price_history import PriceHistory
    from app.models.scraper_log import ScraperLog
    
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
            ).order_by(Product.last_scraped.asc().nullsfirst()).distinct().limit(limit).all()
            
            if not products:
                print("No incomplete products found.")
                break
            
            print(f"Fetched batch of {len(products)} games.")
            
            for p in products:
                if time.time() - start_time > max_duration:
                    break

                success = _scrape_product_logic(db, p)
                
                if success:
                    processed_count += 1
                    db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({"items_processed": processed_count})
                
                # Always update last_scraped and commit to rotate queue
                p.last_scraped = datetime.utcnow()
                db.commit()
                
                time.sleep(random.uniform(0.5, 1.5))
        
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

def _scrape_product_logic(db: Session, product: "Product") -> bool:
    """
    Internal synchronous logic to scrape a single product.
    Returns True if successful, False otherwise.
    """
    from app.models.price_history import PriceHistory
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    if not product.console_name or not product.product_name:
        return False

    # Construct URL
    console_slug = product.console_name.lower().replace(' ', '-')
    product_slug = product.product_name.lower().replace(' ', '-').replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
    while '--' in product_slug:
        product_slug = product_slug.replace('--', '-')
        
    url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
    # print(f"Scraping {product.product_name}...")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 1. Image
            if not product.image_url or "cloudinary" not in product.image_url:
                img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                if img and img.get('src') and "shim.gif" not in img.get('src'):
                    original_url = img.get('src')
                    try:
                        # Upload to Cloudinary
                        upload_result = cloudinary.uploader.upload(original_url, folder="retrocharting/products")
                        product.image_url = upload_result['secure_url']
                    except Exception as e:
                        print(f"  Cloudinary upload failed: {e}")
                        product.image_url = original_url

            # 2. Description
            desc_elem = soup.select_one('#product_description')
            if desc_elem:
                product.description = desc_elem.get_text(strip=True).replace("Description:", "").strip()

            # 3. Details
            for tr in soup.select('tr'):
                tds = tr.select('td')
                if len(tds) >= 2:
                    key = tds[0].get_text(strip=True)
                    value = tds[1].get_text(strip=True)
                    
                    if "Genre:" in key: product.genre = value.replace("edit", "").strip()
                    elif "Publisher:" in key: product.publisher = value.replace("edit", "").strip()
                    elif "Developer:" in key: product.developer = value.replace("edit", "").strip()
                    elif "ESRB Rating:" in key: product.esrb_rating = value.replace("edit", "").strip()
                    elif "Player Count:" in key: product.players = value.replace("edit", "").strip()
                    elif "Description:" in key: product.description = value.strip()

            # 4. Prices
            price_ids = {
                'loose_price': 'used_price',
                'cib_price': 'complete_price',
                'new_price': 'new_price'
            }

            for col, html_id in price_ids.items():
                elem = soup.select_one(f'#{html_id} .price')
                if elem:
                    txt = elem.get_text(strip=True).replace('$', '').replace(',', '').strip()
                    if txt and txt != 'N/A':
                        try:
                            setattr(product, col, float(txt))
                        except:
                            pass

            # 5. Price History
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
                        
                        chart_data = json.loads(json_str)
                        
                        for condition, points in chart_data.items():
                            if not points: continue
                            db_condition = condition
                            if condition == "boxonly": db_condition = "box_only"
                            if condition == "manualonly": db_condition = "manual_only"
                            
                            for point in points:
                                ts = point[0]
                                price = float(point[1])
                                date_obj = datetime.fromtimestamp(ts / 1000.0)
                                
                                exists_sql = "SELECT 1 FROM price_history WHERE product_id = :pid AND date = :date AND condition = :cond"
                                result = db.execute(text(exists_sql), {"pid": product.id, "date": date_obj, "cond": db_condition}).fetchone()
                                
                                if not result:
                                    insert_sql = "INSERT INTO price_history (product_id, date, price, condition) VALUES (:pid, :date, :price, :cond)"
                                    db.execute(text(insert_sql), {"pid": product.id, "date": date_obj, "price": price, "cond": db_condition})
                    except Exception:
                        pass
            
            return True
            
    except Exception as e:
        print(f"  Error processing item: {e}")
        return False
