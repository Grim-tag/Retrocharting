from app.db.session import SessionLocal
from app.models.product import Product

db = SessionLocal()
products = db.query(Product).filter(Product.console_name == "Playstation 5").limit(10).all()

print(f"Found {len(products)} products for Playstation 5")

for p in products:
    print(f"ID: {p.id} | Name: {p.product_name} | Image URL: '{p.image_url}'")
