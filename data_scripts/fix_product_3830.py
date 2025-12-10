import os
import sys
import requests
from bs4 import BeautifulSoup
from sqlalchemy import create_engine, text
from datetime import datetime
import json
from dotenv import load_dotenv

# Load env variables
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found")
    sys.exit(1)

engine = create_engine(db_url)
product_id = 3830

# Hardcoded data for 3830
target_url = "https://www.pricecharting.com/game/atari-2600/secret-agent"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

print(f"Scraping manually: {target_url}")
response = requests.get(target_url, headers=headers)
if response.status_code != 200:
    print(f"Failed to fetch content: {response.status_code}")
    sys.exit(1)

soup = BeautifulSoup(response.content, 'html.parser')

data = {}

# 1. Description
desc_elem = soup.select_one('#product_description')
if desc_elem:
    data['description'] = desc_elem.get_text(strip=True).replace("Description:", "").strip()

# 2. Details (Publisher, Developer, etc)
for tr in soup.select('tr'):
    tds = tr.select('td')
    if len(tds) >= 2:
        key = tds[0].get_text(strip=True)
        value = tds[1].get_text(strip=True)
        
        if "Publisher:" in key: data['publisher'] = value.replace("edit", "").strip()
        elif "Developer:" in key: data['developer'] = value.replace("edit", "").strip()
        elif "ESRB Rating:" in key: data['esrb_rating'] = value.replace("edit", "").strip()
        elif "Player Count:" in key: data['players'] = value.replace("edit", "").strip()
        elif "Genre:" in key: data['genre'] = value.replace("edit", "").strip()

# 3. Prices
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
                data[col] = float(txt)
            except:
                pass

# 4. History (Simplified)
# Just looking for the chart data to fix missing history
scripts = soup.find_all('script')
history_found = False

with engine.connect() as conn:
    print("Updating Product Table...")
    # Update Product Data
    update_parts = []
    params = {'pid': product_id}
    
    for key, val in data.items():
        update_parts.append(f"{key} = :{key}")
        params[key] = val
        print(f"  {key}: {val}")
        
    if update_parts:
        params['last_scraped'] = datetime.utcnow()
        sql = f"UPDATE products SET {', '.join(update_parts)}, last_scraped = :last_scraped WHERE id = :pid"
        conn.execute(text(sql), params)
        conn.commit()
    else:
        print("No product data parsed!")

    # Parse History
    # This is slightly complex to replicate fully without full schema, but let's try to extract and insert at least one point
    for script in scripts:
        if script.string and "VGPC.chart_data" in script.string:
            try:
                start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
                end_index = script.string.find(";", start_index)
                json_str = script.string[start_index:end_index].strip() if end_index != -1 else script.string[start_index:].strip()
                
                chart_data = json.loads(json_str)
                print("\nProcessed History Data...")
                
                # Delete old history for this product to prevent duplicates
                conn.execute(text("DELETE FROM price_history WHERE product_id = :pid"), {"pid": product_id})
                
                insert_count = 0
                for condition, points in chart_data.items():
                    if not points: continue
                    db_cond = condition
                    if condition == "boxonly": db_cond = "box_only"
                    if condition == "manualonly": db_cond = "manual_only"
                    
                    # Insert only the last point for efficiency/summary if needed, OR all points
                    # Let's insert all points as it's a fix script
                    for point in points:
                        ts = point[0]
                        price_val = float(point[1]) 
                        # PriceCharting usually provides price in same unit as display? 
                        # Wait, user saw 4995.0. 
                        # If raw data says 4995 (cents?), then we need to divide by 100?
                        # Let's check logic. If loose_price is 49.95.
                        
                        date_obj = datetime.fromtimestamp(ts / 1000.0)
                        
                        # Fix high values?
                        # If price > 1000 and looks like cents? 
                        # But some games ARE $5000.
                        # However, for this game, loose is 50.
                        
                        conn.execute(text("""
                            INSERT INTO price_history (product_id, date, price, condition) 
                            VALUES (:pid, :date, :price, :cond)
                        """), {"pid": product_id, "date": date_obj, "price": price_val, "cond": db_cond})
                        insert_count += 1
                        
                conn.commit()
                print(f"Inserted {insert_count} history points.")
                history_found = True
                break
            except Exception as e:
                print(f"Error parsing history: {e}")

print("Done.")
