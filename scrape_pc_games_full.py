import requests
from bs4 import BeautifulSoup
import time
import csv
import os

def scrape_full_catalog():
    base_url = "https://www.pricecharting.com/console/pc-games"
    params = {
        "sort": "start-date",
        "cursor-id": "" 
    }
    
    output_file = "backend/app/data/pc_games.csv"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    seen_ids = set()
    
    with open(output_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Header matching our import expectations or simple format
        writer.writerow(["id", "product_name", "console_name", "genre"])
        
        page_count = 0
        
        while True:
            params_str = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{base_url}?{params_str}"
            
            print(f"Scraping Page {page_count+1}: {url}")
            
            try:
                resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
                if resp.status_code != 200:
                    print(f"Error {resp.status_code}")
                    break
            except Exception as e:
                print(f"Exception {e}")
                time.sleep(5)
                continue
                
            soup = BeautifulSoup(resp.content, 'html.parser')
            rows = soup.select('table#games_table tbody tr')
            
            if not rows:
                print("No rows found. Done.")
                break
                
            current_batch = []
            for row in rows:
                id_attr = row.get('id') # "product-12345"
                if not id_attr: continue
                
                pid = id_attr.replace('product-', '')
                
                title_node = row.select_one('td.title a')
                if not title_node: continue
                title = title_node.get_text(strip=True)
                
                # Dedupe
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)
                
                # Write minimal row. 
                # Note: We don't have genre here easily (it's not in the table usually? Wait, let me check).
                # Actually table has class 'genre' on td? No.
                # We'll use "Unknown" or empty.
                
                current_batch.append([pid, title, "PC Games", ""])
                
            writer.writerows(current_batch)
            print(f"  Saved {len(current_batch)} items.")
            
            # Pagination
            # Look for "Next" button/link
            # <a href="?cursor-id=..." rel="next">Next</a>
            next_link = soup.find('a', attrs={'rel': 'next'})
            if next_link:
                # Extract cursor-id from href
                # href="?cursor-id=ABCD&sort=start-date..."
                href = next_link.get('href')
                # Simple extraction
                try:
                    cursor_part = href.split('cursor-id=')[1].split('&')[0]
                    params['cursor-id'] = cursor_part
                    page_count += 1
                    time.sleep(1) # Polite delay
                except IndexError:
                    print("Could not parse next cursor. Done.")
                    break
            else:
                print("No next page. Finished.")
                break

if __name__ == "__main__":
    scrape_full_catalog()
