"""
Diagnose Image URLs in Database
Check what types of external image URLs exist and which work.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.game import Game
from app.models.product import Product
from app.db.session import SessionLocal
import requests

def main():
    db = SessionLocal()
    
    try:
        # Count different URL types
        total = db.query(Product).filter(Product.image_url != None).count()
        
        cloudinary = db.query(Product).filter(
            Product.image_url.contains("cloudinary.com")
        ).count()
        
        pricecharting = db.query(Product).filter(
            Product.image_url.contains("pricecharting.com")
        ).count()
        
        retrocharting = db.query(Product).filter(
            Product.image_url.contains("retrocharting.com")
        ).count()
        
        has_blob = db.query(Product).filter(
            Product.image_blob != None
        ).count()
        
        print(f"=== IMAGE URL ANALYSIS ===")
        print(f"Total with image_url: {total}")
        print(f"Cloudinary URLs: {cloudinary}")
        print(f"PriceCharting URLs: {pricecharting}")
        print(f"RetroCharting URLs: {retrocharting}")
        print(f"Has image_blob (local): {has_blob}")
        print()
        
        # Test a few PriceCharting URLs
        print("Testing PriceCharting URLs...")
        pc_samples = db.query(Product).filter(
            Product.image_url.contains("pricecharting.com"),
            Product.image_blob == None
        ).limit(3).all()
        
        for p in pc_samples:
            try:
                resp = requests.head(p.image_url, timeout=5)
                print(f"  {p.product_name}: {resp.status_code}")
            except Exception as e:
                print(f"  {p.product_name}: ERROR - {e}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
