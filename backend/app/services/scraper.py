
import time
import random
import cloudinary
import cloudinary.uploader
import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, and_
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import json
import os
import shutil

from app.db.session import SessionLocal
# Models imported inside functions to prevent circular imports
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET,
  secure = True
)

def slugify(text: str) -> str:
    """
    Creates an SEO-friendly slug from text.
    "Star Wars Jedi: Fallen Order" -> "star-wars-jedi-fallen-order"
    """
    if not text:
        return "unknown"
    
    # 1. Lowercase
    slug = text.lower()
    
    # 2. Replace specific chars
    slug = slug.replace("'", "").replace(".", "")
    
    # 3. Replace non-alphanumeric with hyphen
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    
    # 4. Trim hyphens
    slug = slug.strip('-')
    
    return slug

def _migrate_cloudinary_image(db: Session, product: "Product") -> bool:
    """
    Downloads existing Cloudinary image and saves locally.
    Avoids scraping PriceCharting HTML.
    """
    try:
        if not product.image_url or "cloudinary" not in product.image_url:
            return False
            
        original_url = product.image_url
        p_slug = slugify(product.product_name)
        filename = f"{p_slug}-{product.id}.jpg"
        
        # Paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        static_img_dir = os.path.join(backend_dir, "static", "images", "products")
        
        if not os.path.exists(static_img_dir):
            os.makedirs(static_img_dir)
            
        local_path = os.path.join(static_img_dir, filename)
        
        # Download
        # Cloudinary URLs are robust, usually no need for special headers
        img_resp = requests.get(original_url, stream=True, timeout=15)
        if img_resp.status_code == 200:
            with open(local_path, 'wb') as f:
                img_resp.raw.decode_content = True
                shutil.copyfileobj(img_resp.raw, f)
            
            # Update DB with Local URL
            product.image_url = f"{settings.API_BASE_URL}/static/images/products/{filename}"
            return True
        else:
             print(f"Cloudinary download failed: {img_resp.status_code}")
             return False

    except Exception as e:
        print(f"Migration error: {e}")
        return False

async def scrape_single_product(db: Session, product: "Product"):
    """
    Smart Scraper:
    1. If metadata (desc, image, publisher) is missing -> Scrape HTML.
    2. ALWAYS Use API (if token available) to update prices to catch Box/Manual.
    """
    # Check if we need rich metadata
    needs_metadata = (
        not product.description or 
        not product.image_url or 
        "cloudinary" in (product.image_url or "") or # Migrate Cloudinary -> Local
        "/static/" not in (product.image_url or "") or # Ensure Local
        not product.publisher
    )

    success_meta = True
    if needs_metadata:
        # Fallback to HTML scraping
        success_meta = _scrape_html_logic(db, product)
    
    success_api = False
    if settings.PRICECHARTING_API_TOKEN:
        # Fast API Update for reliable prices
        success_api = _update_product_via_api(db, product)
    else:
        # If no API, we relied on HTML for prices too
        success_api = success_meta
        
    return success_meta or success_api

from concurrent.futures import ThreadPoolExecutor, as_completed

def process_product_id(product_id: int) -> bool:
    """
    Worker function to process a single product in its own thread/session.
    """
    db = SessionLocal()
    try:
        from app.models.product import Product
        product = db.query(Product).get(product_id)
        if not product:
            return False
            
        # Re-use the smart scraping logic
        # logic helper determines need for HTML vs API
        success = False
        
        # Check metadata needs inside this session
        needs_metadata = (
            not product.description or 
            not product.image_url or 
            "cloudinary" in (product.image_url or "") or
            "/static/" not in (product.image_url or "") or
            not product.publisher
        )

        if needs_metadata:
            # Special fast path for Cloudinary Migration
            if product.image_url and "cloudinary" in product.image_url:
                success = _migrate_cloudinary_image(db, product)
            else:
                success = _scrape_html_logic(db, product)
            
            if success: time.sleep(0.1)
        elif settings.PRICECHARTING_API_TOKEN:
            success = _update_product_via_api(db, product)
            # API is fast
        else:
            success = _scrape_html_logic(db, product)
            if success: time.sleep(0.1)
            
        if success:
            product.last_scraped = datetime.utcnow()
            db.commit()
            return True
        else:
            # Even on failure, update last_scraped so we don't retry endlessly immediately
            product.last_scraped = datetime.utcnow()
            db.commit()
            return False
            
    except Exception as e:
        print(f"Error processing product {product_id}: {e}")
        return False
    finally:
        db.close()

def refresh_prices_job(limit: int = 100):
    """
    Dedicated job to refresh prices for existing products.
    Targets products with pricecharting_id (fast API update).
    """
    from app.models.product import Product
    from app.models.scraper_log import ScraperLog
    
    db: Session = SessionLocal()
    start_time = datetime.utcnow()
    
    # Create Log
    log = ScraperLog(status="running", source="price_refresh", start_time=start_time, items_processed=0)
    db.add(log)
    db.commit()
    db.refresh(log)
    
    try:
        # Find products sorted by last_scraped (Oldest first)
        # MUST have pricecharting_id to be efficient
        products = db.query(Product).filter(
            Product.pricecharting_id != None
        ).order_by(Product.last_scraped.asc().nullsfirst()).limit(limit).all()
        
        if not products:
            print("No products to refresh.")
            db.query(ScraperLog).filter(ScraperLog.id == log.id).update({"status": "completed", "end_time": datetime.utcnow()})
            db.commit()
            return
            
        print(f"Refreshing prices for {len(products)} items...")
        count = 0
        
        for p in products:
            try:
                # Use internal API updater
                # verify if it updates timestamp?
                # _update_product_via_api does NOT commit or update timestamp inside itself?
                # Let's check _update_product_via_api implementation. 
                # It updates product fields. Does NOT commit.
                
                success = _update_product_via_api(db, p)
                if success:
                    p.last_scraped = datetime.utcnow()
                    db.commit() # Commit per item to be safe? Or batch?
                    count += 1
                else:
                    # Even if failed, bump timestamp so we don't retry immediately
                    p.last_scraped = datetime.utcnow()
                    db.commit()
                    
            except Exception as e:
                print(f"Price refresh error {p.id}: {e}")
                
        # Finish
        db.query(ScraperLog).filter(ScraperLog.id == log.id).update({
            "status": "completed", 
            "items_processed": count,
            "end_time": datetime.utcnow()
        })
        db.commit()
        
    except Exception as e:
        print(f"Price refresh global error: {e}")
        db.query(ScraperLog).filter(ScraperLog.id == log.id).update({"status": "error", "error_message": str(e)})
        db.commit()
    finally:
        db.close()

def scrape_missing_data(max_duration: int = 600, limit: int = 50):
    """
    Scrapes data using a thread pool for concurrency.
    """
    start_time = time.time()
    db: Session = SessionLocal()
    
    # Max concurrency
    MAX_WORKERS = 8
    
    print(f"Starting PARALLEL scraper service (Workers: {MAX_WORKERS}). Duration: {max_duration}s")
    
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
                
            # Fetch batch of IDs to process
            # We fetch products but strictly extract IDs to pass to workers
            products = db.query(Product).outerjoin(PriceHistory).filter(
                or_(
                    Product.description == None, 
                    Product.description == "",
                    Product.publisher == None,
                    Product.publisher == "",
                    Product.image_url.contains("cloudinary"), # Target Cloudinary for migration
                    PriceHistory.id == None
                ),
                Product.console_name != None,
                Product.product_name != None
            ).order_by(Product.last_scraped.asc().nullsfirst()).distinct().limit(limit).all()
            
            if not products:
                print("No incomplete products found.")
                break
            
            product_ids = [p.id for p in products]
            print(f"Dispatching batch of {len(product_ids)} games to workers...")
            
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                futures = {executor.submit(process_product_id, pid): pid for pid in product_ids}
                
                for future in as_completed(futures):
                    if time.time() - start_time > max_duration:
                        executor.shutdown(wait=False)
                        break
                        
                    try:
                        success = future.result()
                        if success:
                            processed_count += 1
                            if processed_count % 5 == 0:
                                db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({"items_processed": processed_count})
                                db.commit()
                    except Exception as e:
                        print(f"Worker exception: {e}")

            if time.time() - start_time > max_duration:
                break
                
        # Final status update
        db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({
            "status": "completed", 
            "end_time": datetime.utcnow(),
            "items_processed": processed_count
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

def _update_product_via_api(db: Session, product: "Product") -> bool:
    """
    Uses PriceCharting API to update prices.
    Very fast. Requires settings.PRICECHARTING_API_TOKEN.
    """
    from app.models.price_history import PriceHistory
    
    token = settings.PRICECHARTING_API_TOKEN
    base_url = "https://www.pricecharting.com/api/product"
    
    params = {"t": token}
    
    if product.pricecharting_id:
        params["id"] = product.pricecharting_id
    else:
        # Search by name if no ID
        search_url = "https://www.pricecharting.com/api/products"
        search_params = {"t": token, "q": f"{product.console_name} {product.product_name}"}
        try:
             res = requests.get(search_url, params=search_params, timeout=5)
             if res.status_code == 200:
                 data = res.json()
                 if "products" in data and len(data["products"]) > 0:
                     best_match = data["products"][0]
                     product.pricecharting_id = int(best_match["id"])
                     params["id"] = product.pricecharting_id
                 else:
                     return False # Not found
             else:
                 return False
        except Exception:
            return False

    # Now fetch product details
    try:
        response = requests.get(base_url, params=params, timeout=5)
        if response.status_code != 200:
            return False
            
        data = response.json()
        if data.get("status") != "success":
            return False
            
    
        # Update Prices (API returns cents)
        if "loose-price" in data: product.loose_price = float(data["loose-price"]) / 100.0
        if "cib-price" in data: product.cib_price = float(data["cib-price"]) / 100.0
        if "new-price" in data: product.new_price = float(data["new-price"]) / 100.0
        if "box-only-price" in data: product.box_only_price = float(data["box-only-price"]) / 100.0
        if "manual-only-price" in data: product.manual_only_price = float(data["manual-only-price"]) / 100.0
        
        # Add Price History Entry (Today)
        today_date = datetime.utcnow().date()
        
        def upsert_history(price_val, cond):
            if price_val is None: return
            exists = db.query(PriceHistory).filter(
                PriceHistory.product_id == product.id,
                PriceHistory.date == today_date,
                PriceHistory.condition == cond
            ).first()
            
            if not exists:
                ph = PriceHistory(
                    product_id=product.id,
                    date=today_date,
                    price=price_val,
                    condition=cond
                )
                db.add(ph)
            else:
                exists.price = price_val

        upsert_history(product.loose_price, "loose")
        upsert_history(product.cib_price, "cib")
        upsert_history(product.new_price, "new")
        upsert_history(product.box_only_price, "box_only")
        upsert_history(product.manual_only_price, "manual_only")
        
        return True
        
    except Exception as e:
        print(f"API Error: {e}")
        return False

def _scrape_html_logic(db: Session, product: "Product") -> bool:
    """
    Internal synchronous logic to scrape a single product via HTML.
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
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 1. Image
            # condition: If missing, OR if using Cloudinary (migration), OR if not local yet
            is_local = product.image_url and "/static/images/products" in product.image_url
            if not product.image_url or "cloudinary" in product.image_url or not is_local:
                img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                if img and img.get('src') and "shim.gif" not in img.get('src'):
                    original_url = img.get('src')
                    if img and img.get('src') and "shim.gif" not in img.get('src'):
                        original_url = img.get('src')
                        try:
                            # LOCAL STORAGE LOGIC (Replaces Cloudinary)
                            p_slug = slugify(product.product_name)
                            filename = f"{p_slug}-{product.id}.jpg" # Simple JPG extension
                            
                            # Ensure directories exist
                            # backend/app/services/scraper.py -> ../../../static/images/products
                            # Use absolute path based on settings or relative calculation
                            current_dir = os.path.dirname(os.path.abspath(__file__))
                            backend_dir = os.path.dirname(os.path.dirname(current_dir)) # backend/
                            static_img_dir = os.path.join(backend_dir, "static", "images", "products")
                            
                            if not os.path.exists(static_img_dir):
                                os.makedirs(static_img_dir)
                                
                            local_path = os.path.join(static_img_dir, filename)
                            
                            # Download and Save
                            # Use a separate request to fetch image
                            img_resp = requests.get(original_url, stream=True, timeout=10)
                            if img_resp.status_code == 200:
                                with open(local_path, 'wb') as f:
                                    img_resp.raw.decode_content = True
                                    shutil.copyfileobj(img_resp.raw, f)
                                
                                # Set URL to local static path
                                # e.g. https://api.retrocharting.com/static/images/products/foo.jpg
                                product.image_url = f"{settings.API_BASE_URL}/static/images/products/{filename}"
                            else:
                                print(f"  Image donwload failed: {img_resp.status_code}")
                                product.image_url = original_url # Fallback

                        except Exception as e:
                            print(f"  Local image save failed: {e}")
                            product.image_url = original_url

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
                                price = float(point[1]) / 100.0 # Convert cents to dollars
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
