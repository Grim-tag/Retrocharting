import requests
from bs4 import BeautifulSoup
from app.db.session import SessionLocal
from app.models.user import User
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.collection_item import CollectionItem
from app.models.comment import Comment
from app.models.sniper import SniperResult
from app.models.sales_transaction import SalesTransaction
from app.models.product import Product
import time

def scrape_pc_games_list():
    url = "https://www.pricecharting.com/console/pc-games?cursor-id=&sort=start-date&genre-name="
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    print(f"Scraping {url}...")
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to fetch page: {response.status_code}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')
    rows = soup.select('table#games_table tbody tr')
    
    print(f"Found {len(rows)} games on the first page. Processing...")
    
    db = SessionLocal()
    count = 0
    try:
        batch = []
        for row in rows:
            td_title = row.select_one('td.title a')
            if not td_title: continue
            
            product_name = td_title.get_text(strip=True)
            link = td_title.get('href')
            
            # Simple deduplication check in DB
            exists = db.query(Product).filter(
                Product.console_name == "PC Games",
                Product.product_name == product_name
            ).first()
            
            if exists:
                print(f"Skipping existing: {product_name}")
                continue

            # Create minimal product
            new_product = Product(
                product_name=product_name,
                console_name="PC Games",
                genre="Unknown"
            )
            # We don't have the ID from this list easily unless we parse link logic, 
            # but let's let autoincrement handle DB ID, 
            # and we will rely on subsequent scrape/enrichment to get PriceCharting ID from name match.
            
            batch.append(new_product)
            count += 1
            if len(batch) >= 50:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []
                print(f"Inserted {count}...")
        
        if batch:
            db.bulk_save_objects(batch)
            db.commit()
            
        print(f"Done. Inserted {count} new PC Games.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    scrape_pc_games_list()
