import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.db.session import SessionLocal

def scrape_pc_games_bg_wrapper(limit: int):
    print(f"Starting background PC Games scrape (limit={limit})...")
    db = SessionLocal()
    try:
        scrape_pc_games_service(db, limit)
    except Exception as e:
        print(f"Background scrape failed: {e}")
    finally:
        db.close()
    print("Background scrape finished.")

def scrape_pc_games_service(db: Session, limit: int = 50):
    url = "https://www.pricecharting.com/console/pc-games?cursor-id=&sort=start-date&genre-name="
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    
    page_count = 0
    total_added = 0
    
    # Pre-fetch existing PC games logic restored
    existing_names = {
        name for name, in db.query(Product.product_name).filter(Product.console_name == "PC Games").all()
    }
    try:
        session = requests.Session()
        session.headers.update(headers)
        
        print(f"Scraping Page 1 (GET): {url}")
        response = session.get(url, timeout=15)
        if response.status_code != 200:
            return {"status": "error", "message": f"Failed to fetch initial page: {response.status_code}"}
        
        while True:
            # Parse Page
            soup = BeautifulSoup(response.content, 'html.parser')
            rows = soup.select('table#games_table tbody tr')
            
            batch = []
            
            # Pre-fetch existing names for this batch context? 
            # Ideally we check one by one or fetch all at start. fetching all is safer for massive loop.
            # We'll just ignore unique constraint errors or check DB efficiently.
            # For speed in this loop, let's trust "existing_names" set we built earlier?
            # It might be stale after first batch? No, we are the only writer.
            
            # Refresh existing names check to be safe or just use set
            # We already have 'existing_names' from start of function.
            
            current_page_added = 0
            for row in rows:
                td_title = row.select_one('td.title a')
                if not td_title: continue
                
                product_name = td_title.get_text(strip=True)
                
                if product_name in existing_names:
                    continue
                
                # Dedupe within batch
                if any(p.product_name == product_name for p in batch):
                    continue

                new_product = Product(
                    product_name=product_name,
                    console_name="PC Games",
                    genre="Unknown"
                )
                batch.append(new_product)
                existing_names.add(product_name) # Update local set
                current_page_added += 1
                total_added += 1
                
                # Global limit check
                if total_added >= limit:
                    break
            
            if batch:
                db.bulk_save_objects(batch)
                db.commit()
                print(f"  Added {len(batch)} items from page {page_count + 1}")
            
            if total_added >= limit:
                print("Limit reached.")
                break
            
            # 2. Find Next Cursor
            form = soup.select_one('form.next_page')
            if not form:
                print("No next page (form) found. Finished.")
                break
                
            cursor_input = form.select_one('input[name="cursor"]')
            if not cursor_input:
                print("No cursor input found in form. Finished.")
                break
                
            cursor_value = cursor_input.get('value')
            if not cursor_value:
                break
                
            # 3. POST for next page
            print(f"Scraping Page {page_count + 2} (POST cursor={cursor_value})...")
            try:
                # PriceCharting POSTs to the same URL
                # Note: The form has no action, so it posts to current URL.
                page_count += 1
                response = session.post(url, data={"cursor": cursor_value}, timeout=15)
                if response.status_code != 200:
                    print(f"Failed to fetch next page: {response.status_code}")
                    break
            except Exception as e:
                print(f"Error fetching next page: {e}")
                break
            
            import time
            time.sleep(1) # Polite delay
            
    except Exception as e:
        return {"status": "error", "message": str(e), "added_count": total_added}
            
    return {"status": "success", "added_count": total_added, "pages_scraped": page_count + 1}
