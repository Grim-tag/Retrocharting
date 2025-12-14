import sys
import os

# Ensure backend dir is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base

# Import ALL models
from app.models.collection_item import CollectionItem
from app.models.comment import Comment
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.product import Product
from app.models.sales_transaction import SalesTransaction
from app.models.scraper_log import ScraperLog
from app.models.sniper import SniperWatch
from app.models.translation import Translation
from app.models.user import User

from app.routers.products import update_listings_background

db = SessionLocal()
p_id = 34092 # Nintendo NES Action Set

print(f"--- Cleaning Amazon listings for product {p_id} ---")
# 1. Delete old/bad Amazon listings
deleted = db.query(Listing).filter(Listing.product_id == p_id, Listing.source == 'Amazon').delete()
db.commit()
print(f"Deleted {deleted} stale Amazon listings.")

# 2. Re-run background task (Synchronously)
print("Running update_listings_background...")
update_listings_background(p_id)

# 3. Check results
listings = db.query(Listing).filter(Listing.product_id == p_id, Listing.source == 'Amazon').all()
print(f"New Amazon Listings Found: {len(listings)}")

for l in listings:
    print(f"Title: {l.title}")
    print(f"Price: {l.price}")
    print(f"URL: {l.url}")
    print("-" * 20)

db.close()
