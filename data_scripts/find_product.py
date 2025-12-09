import sys
import os
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), '.env'))

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.sales_transaction import SalesTransaction
from app.models.product import Product
from app.models.price_history import PriceHistory

db = SessionLocal()
# Get a product that has price history
history = db.query(PriceHistory).first()
if history:
    p = db.query(Product).get(history.product_id)
    print(f"Product: {p.product_name}")
    print(f"Console: {p.console_name}")
    print(f"ID: {p.id}")
else:
    print("No history found.")
db.close()
