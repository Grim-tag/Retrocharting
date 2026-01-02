from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product

db = SessionLocal()
products = db.query(Product).filter(Product.product_name.like("%GoldenEye%")).all()

print(f"Found {len(products)} products")
for p in products:
    print(f"[{p.id}] {p.console_name} - {p.product_name}")
    print(f"   Loose: {p.loose_price} | CIB: {p.cib_price} | New: {p.new_price}")
