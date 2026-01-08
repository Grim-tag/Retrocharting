from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product

db = SessionLocal()

p_count = db.query(Product).count()
g_count = db.query(Game).count()

print(f"Total Products: {p_count}")
print(f"Total Games: {g_count}")

# Check a sample product
p = db.query(Product).first()
if p:
    print(f"Sample Product: {p.id} - {p.product_name}")
db.close()
