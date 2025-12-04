import requests
from bs4 import BeautifulSoup
import sqlite3
import json
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def debug_history():
    url = "https://www.pricecharting.com/game/nes/little-samson"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    print(f"Fetching {url}...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for script containing VGPC.chart_data
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and "VGPC.chart_data" in script.string:
                try:
                    print("Found chart data script.")
                    start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
                    end_index = script.string.find(";", start_index)
                    if end_index == -1:
                        json_str = script.string[start_index:].strip()
                    else:
                        json_str = script.string[start_index:end_index].strip()
                    
                    chart_data = json.loads(json_str)
                    print(f"Keys: {chart_data.keys()}")
                    
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    
                    # Get product ID for Little Samson
                    cursor.execute("SELECT id FROM products WHERE product_name = 'Little Samson' AND console_name = 'NES'")
                    row = cursor.fetchone()
                    if not row:
                        print("Little Samson not found in DB.")
                        return
                    product_id = row[0]
                    print(f"Product ID: {product_id}")
                    
                    count = 0
                    for condition, points in chart_data.items():
                        if not points: continue
                        
                        db_condition = condition
                        if condition == "boxonly": db_condition = "box_only"
                        if condition == "manualonly": db_condition = "manual_only"
                        
                        print(f"Processing {condition} ({len(points)} points)...")
                        
                        for point in points:
                            ts = point[0]
                            price = float(point[1])
                            date_obj = datetime.fromtimestamp(ts / 1000.0).date()
                            
                            # Check existence
                            cursor.execute("SELECT 1 FROM price_history WHERE product_id = ? AND date = ? AND condition = ?", (product_id, date_obj, db_condition))
                            if not cursor.fetchone():
                                cursor.execute("INSERT INTO price_history (product_id, date, price, condition) VALUES (?, ?, ?, ?)", (product_id, date_obj, price, db_condition))
                                count += 1
                    
                    conn.commit()
                    print(f"Saved {count} new price history records.")
                    conn.close()
                    return
                    
                except Exception as e:
                    print(f"Error: {e}")

if __name__ == "__main__":
    debug_history()
