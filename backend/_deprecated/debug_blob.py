from app.db.session import SessionLocal
from app.models.product import Product

def check_blob(product_id):
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.id == product_id).first()
        if not p:
            print(f"Product {product_id} not found.")
            return
            
        print(f"Product: {p.product_name}")
        print(f"Image URL: {p.image_url}")
        if p.image_blob:
            print(f"Blob Size: {len(p.image_blob)} bytes")
        else:
            print("Blob is NULL/Empty!")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_blob(70958)
