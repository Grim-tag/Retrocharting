import requests
from bs4 import BeautifulSoup
import sqlite3
import json
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')

def update_nes_console():
    # NES Console URL
    url = "https://www.pricecharting.com/game/nes/nes-console"
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
                    
                    conn = sqlite3.connect(DB_PATH)
                    cursor = conn.cursor()
                    
                    # Get product ID for Nintendo NES Console
                    cursor.execute("SELECT id, product_name FROM products WHERE product_name = 'Nintendo NES Console' AND console_name = 'NES'")
                    row = cursor.fetchone()
                    if not row:
                        print("Nintendo NES Console not found in DB.")
                        return
                    
                    product_id = row[0]
                    product_name = row[1]
                    print(f"Updating {product_name} (ID: {product_id})...")
                    
                    count = 0
                    for condition, points in chart_data.items():
                        if not points: continue
                        
                        db_condition = condition
                        if condition == "boxonly": db_condition = "box_only"
                        if condition == "manualonly": db_condition = "manual_only"
                        
                        for point in points:
                            ts = point[0]
                            price = float(point[1])
                            date_obj = datetime.fromtimestamp(ts / 1000.0).date()
                            
                            cursor.execute("SELECT 1 FROM price_history WHERE product_id = ? AND date = ? AND condition = ?", (product_id, date_obj, db_condition))
                            if not cursor.fetchone():
                                cursor.execute("INSERT INTO price_history (product_id, date, price, condition) VALUES (?, ?, ?, ?)", (product_id, date_obj, price, db_condition))
                                count += 1
                    
                    conn.commit()
                    print(f"Saved {count} new price history records for {product_name}.")
                    conn.close()
                    return
                    
                except Exception as e:
                    print(f"Error: {e}")

if __name__ == "__main__":
    update_nes_console()
