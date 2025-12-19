import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.price_history import PriceHistory

def scrape_pc_games_service(db: Session, limit: int = 50):
    url = "https://www.pricecharting.com/console/pc-games?cursor-id=&sort=start-date&genre-name="
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    print(f"Scraping {url}...")
    try:
        response = requests.get(url, headers=headers, timeout=15)
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
    if response.status_code != 200:
        return {"status": "error", "message": f"Failed to fetch page: {response.status_code}"}

    soup = BeautifulSoup(response.content, 'html.parser')
    rows = soup.select('table#games_table tbody tr')
    
    count = 0
    batch = []
    
    # Pre-fetch existingPC games names to minimize queries
    existing_names = {
        name for name, in db.query(Product.product_name).filter(Product.console_name == "PC Games").all()
    }
    
    for row in rows:
        td_title = row.select_one('td.title a')
        if not td_title: continue
        
        product_name = td_title.get_text(strip=True)
        
        if product_name in existing_names:
            continue

        # Create minimal product
        new_product = Product(
            product_name=product_name,
            console_name="PC Games",
            genre="Unknown"
        )
        batch.append(new_product)
        count += 1
        
        if len(batch) >= limit:
            break
            
    if batch:
        db.bulk_save_objects(batch)
        db.commit()
            
    return {"status": "success", "added_count": count}
