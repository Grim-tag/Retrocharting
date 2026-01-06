from app.db.session import SessionLocal
from app.models.product import Product
from sqlalchemy import text

def analyze():
    db = SessionLocal()
    try:
        print("Analyzing Image Sources...")
        
        # 1. Total Scraped
        total = db.query(Product).filter(Product.image_url != None).count()
        
        # 2. Breakdown
        local = db.query(Product).filter(Product.image_url.like("%retrocharting%")).count()
        cloudinary = db.query(Product).filter(Product.image_url.like("%cloudinary%")).count()
        pricecharting = db.query(Product).filter(Product.image_url.like("%pricecharting%")).count()
        igdb = db.query(Product).filter(Product.image_url.like("%igdb%")).count()
        
        # 3. Blob Check (How many have data but weird URL?)
        # Products with Blob Data
        has_blob = db.query(Product).filter(Product.image_blob != None).count()
        
        # Products with Blob BUT External URL (Need URL Update)
        blob_but_external = db.query(Product).filter(
            Product.image_blob != None,
            ~Product.image_url.like("%retrocharting%")
        ).count()

        print(f"--- IMAGE REPORT ---")
        print(f"Total with Image URL: {total}")
        print(f"Protected (Local/DB): {local}")
        print(f"Broken/Risk (Cloudinary): {cloudinary}")
        print(f"External (PriceCharting): {pricecharting}")
        print(f"External (IGDB): {igdb}")
        print(f"--------------------")
        print(f"Actual Data in Blob: {has_blob}")
        print(f"Safety Net: {blob_but_external} items have data in DB but use external URL (Recoverable instantly).")
        
    finally:
        db.close()

if __name__ == "__main__":
    analyze()
