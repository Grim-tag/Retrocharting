from app.db.session import SessionLocal
from app.models.product import Product
# Import others to register mappers
try:
    from app.models.listing import Listing
    from app.models.price_history import PriceHistory
except:
    pass

db = SessionLocal()
ids = [92386, 67013, 27953]
products = db.query(Product).filter(Product.id.in_(ids)).all()

print(f"{'ID':<8} | {'PRODUCT NAME':<50} | {'CONSOLE NAME':<30}")
print("-" * 100)
for p in products:
    print(f"{p.id:<8} | {p.product_name:<50} | {p.console_name:<30}")
db.close()
