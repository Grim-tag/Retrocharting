from app.db.session import SessionLocal
# Full Imports
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.models.comment import Comment
from app.models.collection_item import CollectionItem
from app.models.user import User
from app.models.sniper import SniperWatch
from app.models.scraper_log import ScraperLog
from app.models.product import Product

db = SessionLocal()
count = db.query(Product).filter(
    Product.console_name == 'Playstation 5',
    Product.ean != None,
    Product.ean != ""
).count()
total = db.query(Product).filter(Product.console_name == 'Playstation 5').count()

print(f"PS5 EANs: {count} / {total} ({(count/total)*100:.1f}%)")
db.close()
