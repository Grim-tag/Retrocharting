import asyncio
import os
import sys
from dotenv import load_dotenv

# Load env variables
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
load_dotenv(env_path)

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.db.session import SessionLocal
from app.services.scraper import scrape_single_product
from app.models.product import Product
from app.models.listing import Listing
from app.models.price_history import PriceHistory

async def main():
    db = SessionLocal()
    try:
        product_id = 3830
        print(f"Fetching product {product_id}...")
        product = db.query(Product).filter(Product.id == product_id).first()
        
        if not product:
            print("Product not found!")
            return

        print(f"Starting scrape for: {product.product_name} ({product.console_name})")
        print(f"Current Last Scraped: {product.last_scraped}")
        
        # Scrape
        result = await scrape_single_product(db, product)
        
        # Commit manually just in case scraper didn't (though it usually does)
        db.commit()
        db.refresh(product)
        
        print("\n=== SCRAPE COMPLETE ===")
        print(f"New Last Scraped: {product.last_scraped}")
        print(f"New Loose Price: {product.loose_price}")
        print(f"Publisher: {product.publisher}")
        print(f"New Image URL: {product.image_url}")
        print(f"Developer: {product.developer}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
