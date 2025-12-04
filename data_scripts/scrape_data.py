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
from app.models.product import Product
from app.models.listing import Listing
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
    db: Session = SessionLocal()
    
    # Get products without description OR without price history
    from sqlalchemy import or_, text
    from app.models.price_history import PriceHistory
    
    # LIMIT to 50 items per run to avoid timeouts on Cron Jobs
    products = db.query(Product).outerjoin(PriceHistory).filter(
        or_(Product.description == None, PriceHistory.id == None)
    ).distinct().limit(50).all()
    
    print(f"Found {len(products)} games to scrape details for.")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    count = 0
    for p in products:
        # Construct URL: https://www.pricecharting.com/game/{console-slug}/{product-slug}
        console_slug = p.console_name.lower().replace(' ', '-')
        product_slug = p.product_name.lower().replace(' ', '-').replace('[', '').replace(']', '').replace('/', '-').replace(':', '').replace('.', '').replace("'", "")
        
        while '--' in product_slug:
            product_slug = product_slug.replace('--', '-')
            
        url = f"https://www.pricecharting.com/game/{console_slug}/{product_slug}"
        print(f"[{count+1}/{len(products)}] Scraping {p.product_name} ({url})...")
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # 1. Image (if missing or not hosted on Cloudinary)
                if not p.image_url or "cloudinary" not in p.image_url:
                    img = soup.select_one('#product_images img') or soup.select_one('.cover img')
                    if img and img.get('src') and "shim.gif" not in img.get('src'):
                        original_url = img.get('src')
                        
                        # Upload to Cloudinary
                        try:
                            import cloudinary.uploader
                            upload_result = cloudinary.uploader.upload(original_url, folder="retrocharting/products")
                            p.image_url = upload_result['secure_url']
                            print(f"  Uploaded image to Cloudinary: {p.image_url}")
                        except Exception as e:
                            print(f"  Error uploading to Cloudinary: {e}")
                            # Fallback to original URL if upload fails
                            p.image_url = original_url

                # 2. Description
                desc_elem = soup.select_one('#product_description')
                if desc_elem:
                    # Clean up text (remove "Description:" prefix if present)
                    desc_text = desc_elem.get_text(strip=True).replace("Description:", "").strip()
                    p.description = desc_text
                    print(f"  Found description ({len(desc_text)} chars).")

                # 3. Details & Description
                # Structure seems to be: <tr><td class="title">Key:</td><td class="details">Value</td></tr>
                # We iterate through all rows in the document (or specifically in the attributes table if we could find it)
                # But searching all 'tr' is safer as selectors vary.
                
                for tr in soup.select('tr'):
                    tds = tr.select('td')
                    if len(tds) >= 2:
                        key = tds[0].get_text(strip=True)
                        value = tds[1].get_text(strip=True)
                        
                        if "Genre:" in key:
                            p.genre = value.replace("edit", "").strip()
                        elif "Publisher:" in key:
                            p.publisher = value.replace("edit", "").strip()
                        elif "Developer:" in key:
                            p.developer = value.replace("edit", "").strip()
                        elif "ESRB Rating:" in key:
                            p.esrb_rating = value.replace("edit", "").strip()
                        elif "Player Count:" in key:
                            p.players = value.replace("edit", "").strip()
                        elif "Description:" in key: # Sometimes description is in the table?
                             # If description is in the table
                             p.description = value.strip()

                # Fallback for Description if not found in table (often it's a separate div)
                if not p.description:
                     desc_elem = soup.select_one('#product_description')
                     if desc_elem:
                         p.description = desc_elem.get_text(strip=True).replace("Description:", "").strip()
                     else:
                         # Try finding a td with class 'details' that is NOT a sibling of a known title?
                         # Or just look for the text "Description" in a header?
                         # Based on debug, description might be in a td.details but without a clear title row sometimes?
                         # Let's stick to #product_description and table for now.
                         pass

                # 4. Price History (Chart Data)
                # Look for script containing VGPC.chart_data
                scripts = soup.find_all('script')
                for script in scripts:
                    if script.string and "VGPC.chart_data" in script.string:
                        try:
                            # Extract JSON string
                            # Format: VGPC.chart_data = { ... };
                            start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
                            end_index = script.string.find(";", start_index)
                            if end_index == -1:
                                # Sometimes it might not end with semicolon or be the last thing
                                # Try to find the matching closing brace? Or just take the rest if it looks like JSON
                                # Let's assume it ends with semicolon for now or end of string
                                json_str = script.string[start_index:].strip()
                            else:
                                json_str = script.string[start_index:end_index].strip()
                            
                            import json
                            from datetime import datetime
                            
                            chart_data = json.loads(json_str)
                            
                            # chart_data keys are usually: "loose", "cib", "new", "graded", "boxonly", "manualonly"
                            # Values are lists of [timestamp, price]
                            
                            # We need to insert these into price_history table
                            # To avoid duplicates, we could check if it exists, or just insert ignore?
                            # For now, let's just insert everything and maybe we can clean up duplicates later or use a unique constraint.
                            # Actually, inserting thousands of rows per game might be slow.
                            # Let's just insert the last 5 points for now to test? No, user wants history.
                            # Let's insert all.
                            
                            for condition, points in chart_data.items():
                                if not points:
                                    continue
                                    
                                # Map condition names if needed
                                # loose -> loose, cib -> cib, new -> new, graded -> graded
                                # boxonly -> box_only, manualonly -> manual_only
                                db_condition = condition
                                if condition == "boxonly": db_condition = "box_only"
                                if condition == "manualonly": db_condition = "manual_only"
                                
                                for point in points:
                                    # point is [timestamp, price]
                                    # timestamp is usually milliseconds
                                    ts = point[0]
                                    price = float(point[1])
                                    
                                    # Convert timestamp to date
                                    date_obj = datetime.fromtimestamp(ts / 1000.0).date()
                                    
                                    # Check if exists to avoid duplicates (slow but safe)
                                    # Optimization: Load all existing dates for this product/condition into a set first?
                                    # For now, simple check.
                                    
                                    # Using raw SQL for speed/simplicity in this script context
                                    # But we are using SQLAlchemy session 'db' here? No, 'db' is a session.
                                    # Let's use raw cursor for bulk insert if possible, or just SQLAlchemy objects.
                                    # The script uses 'session' from 'db.session'.
                                    
                                    # Let's use raw SQL for check and insert to be faster
                                    # conn = db.connection().connection
                                    # cursor = conn.cursor()
                                    # But we are inside a loop with 'db' session.
                                    
                                    # Let's just try to insert and catch integrity error if we had a unique constraint (we don't yet).
                                    # Let's check existence.
                                    
                                    # Check if record exists
                                    exists_sql = "SELECT 1 FROM price_history WHERE product_id = :pid AND date = :date AND condition = :cond"
                                    result = db.execute(text(exists_sql), {"pid": p.id, "date": date_obj, "cond": db_condition}).fetchone()
                                    
                                    if not result:
                                        insert_sql = "INSERT INTO price_history (product_id, date, price, condition) VALUES (:pid, :date, :price, :cond)"
                                        db.execute(text(insert_sql), {"pid": p.id, "date": date_obj, "price": price, "cond": db_condition})

                            print(f"  Saved price history.")
                            
                        except Exception as e:
                            print(f"  Error parsing chart data: {e}")

                db.commit()
                print("  Saved.")
                
            else:
                print(f"  Failed to load page: {response.status_code}")
        except Exception as e:
            print(f"  Error: {e}")
            
        count += 1
        time.sleep(random.uniform(0.5, 1.5))

if __name__ == "__main__":
    scrape_data()
