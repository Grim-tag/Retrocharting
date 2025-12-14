
import sys
import os

# Fix import path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.product import Product
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.services.igdb import igdb_service

# Setup DB
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL missing")
    sys.exit(1)

engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def debug_enrichment(product_id):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        print("Product not found")
        return

    print(f"Product: {product.product_name} (ID: {product.id})")
    
    # 1. Simulate cleanup logic
    search_query = product.product_name
    for term in ['[PAL]', '[JP]', '[NTSC]', 'PAL', 'NTSC-U', 'NTSC-J']:
        search_query = search_query.replace(term, '').strip()
    
    print(f"Search Query: '{search_query}'")
    
    # 2. Search IGDB
    print("Searching IGDB...")
    try:
        games = igdb_service.search_game(search_query)
        if not games:
            print("❌ No matches found on IGDB.")
            return

        print(f"✅ Found {len(games)} matches.")
        for i, g in enumerate(games[:3]):
            print(f"   {i+1}: {g['name']} (ID: {g['id']}) - Release: {g.get('first_release_date', 'N/A')}")
            
        match = games[0]
        print(f"Selected match: {match['name']} ({match['id']})")
        
        # 3. Get Details
        print(f"Fetching details for ID {match['id']}...")
        details = igdb_service.get_game_details(match['id'])
        
        if not details:
            print("❌ Failed to get details.")
            return
            
        print("--- IGDB Data ---")
        print(f"Summary: {details.get('summary')[:100]}...")
        print(f"Genres: {[g['name'] for g in details.get('genres', [])]}")
        print(f"Companies: {len(details.get('involved_companies', []))}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_enrichment(36006)
