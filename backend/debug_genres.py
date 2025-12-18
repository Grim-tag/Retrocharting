import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.db.session import SessionLocal
# Import ALL models to ensure mappers are registered
from app.models import product, price_history, sales_transaction, user, listing, scraper_log 
from app.models.product import Product

db = SessionLocal()

def check_wii():
    print("--- Checking Wii Products ---")
    # Get all products with 'Wii' in console_name
    products = db.query(Product).filter(Product.console_name.ilike('%Wii%')).limit(100).all()
    
    genres = set()
    console_products = []
    
    for p in products:
        if p.genre:
            genres.add(p.genre)
        
        # Check potential console hardware
        if "console" in p.product_name.lower() or "system" in p.product_name.lower():
            console_products.append(f"{p.product_name} [{p.genre}]")

    print(f"Unique Genres found: {genres}")
    print("\nPotential Consoles found:")
    for cp in console_products[:10]:
        print(cp)

    print("\n--- Checking 'Systems' Genre ---")
    systems = db.query(Product).filter(Product.console_name.ilike('%Wii%'), Product.genre == 'Systems').count()
    print(f"Number of Wii products with genre='Systems': {systems}")

if __name__ == "__main__":
    check_wii()
