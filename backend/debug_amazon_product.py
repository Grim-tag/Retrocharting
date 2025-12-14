import sys
import os

# Ensure backend dir is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal, engine, Base

# Import ALL models to avoid registry errors
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
p_id = 67261

try:
    product = db.query(Product).filter(Product.id == p_id).first()
    if not product:
        print(f"Product {p_id} not found!")
        sys.exit(1)

    print(f"Product: {product.product_name} ({product.console_name})")

    # Check existing
    existing = db.query(Listing).filter(Listing.product_id == p_id).all()
    print(f"Current Listings: {len(existing)} (Sources: {set(l.source for l in existing)})")

    print("Force running background update...")
    update_listings_background(p_id)

    # Check after
    # Need to commit/refresh? update_listings_background uses its own session but writes to DB.
    # Our session might be stale?
    db.expire_all()
    
    existing_new = db.query(Listing).filter(Listing.product_id == p_id).all()
    print(f"New Listings: {len(existing_new)} (Sources: {set(l.source for l in existing_new)})")
    
    amazon = [l for l in existing_new if l.source == 'Amazon']
    print(f"Amazon Listings Found: {len(amazon)}")
    for a in amazon:
        print(f" - {a.title}: {a.price} {a.currency}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
