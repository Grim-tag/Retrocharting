import sys
import os
import time
import random
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import text, or_
from datetime import datetime
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# --- Configuration ---
MAX_WORKERS = 5  # Number of parallel threads
BATCH_SIZE = 50   # Database batch size
REQUEST_TIMEOUT = 10
MAX_RETRIES = 2
DELAY_MIN = 0.5
DELAY_MAX = 2.0

# User Agents for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
]

# --- Setup Environment ---
# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

if not os.environ.get("DATABASE_URL"):
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from app.db.session import SessionLocal
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.sales_transaction import SalesTransaction
from app.models.comment import Comment
from app.models.user import User
from app.models.collection_item import CollectionItem
from app.models.sniper import SniperWatch
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

def get_random_header():
    return {"User-Agent": random.choice(USER_AGENTS)}

def slugify(text):
    if not text: return ""
    slug = text.lower().replace(' ', '-')
    # Remove specific characters but keep logical ones
    slug = slug.replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug

def scrape_single_product(product_info):
    """
    Worker function to scrape a single product.
    Returns a dict with updates found, or None if failed/no data.
    """
    p_id = product_info['id']
    console_name = product_info['console_name']
    product_name = product_info['product_name']
    
    # Simulate processing delay/jitter
    time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))
    
    console_slug = slugify(console_name)
    product_slug = slugify(product_name)
    
    url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
    
    updates = {
        'id': p_id,
        'image_url': None,
        'description': None,
        'details': {},
        'price_history': [],
        'success': False,
        'url': url
    }
    
    try:
        response = requests.get(url, headers=get_random_header(), timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            return updates # Return empty success=False
        
        soup = BeautifulSoup(response.content, 'html.parser')
        updates['success'] = True

        # 1. Image (Cloudinary upload inside worker to save time on main thread)
        # Check if we need image (passed in info)
        if product_info.get('needs_image'):
            img = soup.select_one('#product_images img') or soup.select_one('.cover img')
            if img and img.get('src') and "shim.gif" not in img.get('src'):
                original_url = img.get('src')
                try:
                    # Sync upload
                    # SEO Optimization: Slugify filename and force WebP
                    seo_filename = slugify(f"{product_name}-{console_name}")
                    upload_result = cloudinary.uploader.upload(
                        original_url, 
                        folder="retrocharting/products",
                        public_id=seo_filename,
                        format="webp",
                        overwrite=True
                    )
                    updates['image_url'] = upload_result['secure_url']
                except Exception:
                    updates['image_url'] = original_url # Fallback

        # 2. Description
        desc_elem = soup.select_one('#product_description')
        if desc_elem:
            updates['description'] = desc_elem.get_text(strip=True).replace("Description:", "").strip()

        # 3. Details
        for tr in soup.select('tr'):
            tds = tr.select('td')
            if len(tds) >= 2:
                key = tds[0].get_text(strip=True)
                value = tds[1].get_text(strip=True)
                if "Genre:" in key: updates['details']['genre'] = value.replace("edit", "").strip()
                elif "Publisher:" in key: updates['details']['publisher'] = value.replace("edit", "").strip()
                elif "Developer:" in key: updates['details']['developer'] = value.replace("edit", "").strip()
                elif "ESRB Rating:" in key: updates['details']['esrb_rating'] = value.replace("edit", "").strip()

        # 4. Price History
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and "VGPC.chart_data" in script.string:
                try:
                    start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
                    end_index = script.string.find(";", start_index)
                    json_str = script.string[start_index:] if end_index == -1 else script.string[start_index:end_index]
                    
                    import json
                    chart_data = json.loads(json_str.strip())
                    
                    for condition, points in chart_data.items():
                        if not points: continue
                        db_condition = condition
                        if condition == "boxonly": db_condition = "box_only"
                        if condition == "manualonly": db_condition = "manual_only"
                        
                        for point in points:
                            updates['price_history'].append({
                                'date': point[0], # ts
                                'price': float(point[1]),
                                'condition': db_condition
                            })
                except Exception:
                    pass
                    
    except Exception as e:
        print(f"Error scraping {product_name}: {e}")
        
    return updates

from app.models.scraper_log import ScraperLog

def main():
    db = SessionLocal()
    print("Starting Fast Scraper...")
    
    # Create Log Entry
    log_entry = ScraperLog(status="running", items_processed=0, start_time=datetime.utcnow())
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    current_log_id = log_entry.id
    
    # Run for max 12 minutes (720s) to fit in 15m cron schedule
    start_time = time.time()
    MAX_DURATION = 720 
    
    try:
        total_processed = 0
        
        while True:
            elapsed = time.time() - start_time
            if elapsed > MAX_DURATION:
                print(f"Time limit reached ({elapsed:.1f}s). Stopping for now.")
                break

            # Fetch batch of products needing update
            request_limit = BATCH_SIZE
            
            # Criteria: No Description OR No Image (we can add History check too but let's focus on these)
            # Efficient query
            query = db.query(Product).outerjoin(PriceHistory).filter(
                or_(Product.description == None, Product.image_url == None, PriceHistory.id == None),
                Product.console_name != None
            ).order_by(Product.last_scraped.asc().nullsfirst()).distinct().limit(request_limit)
            
            products = query.all()
            
            if not products:
                print("No more products to scrape.")
                break
                
            print(f"preparing batch of {len(products)} products...")
            
            # Prepare tasks
            tasks = []
            product_map = {p.id: p for p in products}
            
            for p in products:
                tasks.append({
                    'id': p.id,
                    'console_name': p.console_name,
                    'product_name': p.product_name,
                    'needs_image': not p.image_url or "cloudinary" not in p.image_url
                })
            
            # Execute in parallel
            results = []
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_to_id = {executor.submit(scrape_single_product, task): task['id'] for task in tasks}
                for future in as_completed(future_to_id):
                    res = future.result()
                    if res:
                        results.append(res)

            # Write results to DB (Single Thread)
            print(f"Batch finished. Writing {len(results)} updates to DB...")
            
            processed_in_this_batch = 0

            # 1. First, mark ALL items in this batch as scraped (Timestamp update)
            # This ensures even failed ones get rotated to the back of the line
            for p in products:
                p.last_scraped = datetime.utcnow()

            # 2. Then apply successful updates
            for res in results:
                if not res.get('success'): continue
                
                p = product_map.get(res['id'])
                if not p: continue
                
                processed_in_this_batch += 1
                
                # Update Text Fields
                if res['image_url']: p.image_url = res['image_url']
                if res['description']: p.description = res['description']
                if res['details'].get('genre'): p.genre = res['details']['genre']
                if res['details'].get('publisher'): p.publisher = res['details']['publisher']
                if res['details'].get('developer'): p.developer = res['details']['developer']
                if res['details'].get('esrb_rating'): p.esrb_rating = res['details']['esrb_rating']

                # Update Price History
                if res['price_history']:
                   for ph in res['price_history']:
                       ts = ph['date']
                       date_obj = datetime.fromtimestamp(ts / 1000.0).date()
                       
                       # Check existence (this is the slow part, maybe optimize later?)
                       exists = db.query(PriceHistory.id).filter(
                           PriceHistory.product_id == p.id,
                           PriceHistory.date == date_obj,
                           PriceHistory.condition == ph['condition']
                       ).first()
                       
                       if not exists:
                           new_ph = PriceHistory(
                               product_id=p.id,
                               date=date_obj,
                               price=ph['price'],
                               condition=ph['condition']
                           )
                           db.add(new_ph)

            db.commit()
            total_processed += len(results)
            print(f"Committed. Total processed: {total_processed}")
            
            # Update Log Live
            db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({"items_processed": total_processed})
            db.commit()

        # Mark confirmed Completion
        db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({
            "status": "completed", 
            "end_time": datetime.utcnow()
        })
        db.commit()
            
    except KeyboardInterrupt:
        print("Stopping...")
        db.query(ScraperLog).filter(ScraperLog.id == current_log_id).update({
            "status": "stopped", 
            "end_time": datetime.utcnow()
        })
        db.commit()
    except Exception as e:
        print(f"Global Error: {e}")
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

if __name__ == "__main__":
    main()
