
import os
import sys
import cloudinary
import cloudinary.uploader
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from slugify import slugify
import time

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

# Cloudinary Config (Get from Env or Hardcode for script if env not loaded)
# Assuming env vars are set or we load them
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

cloudinary.config(
  cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
  api_key = os.getenv('CLOUDINARY_API_KEY'),
  api_secret = os.getenv('CLOUDINARY_API_SECRET'),
  secure = True
)

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# RAW SQL Version to avoid ORM Mapper issues
def migrate():
    print("Starting migration (Raw SQL Mode)...")
    with engine.connect() as conn:
        # 1. Fetch products
        markup = text("SELECT id, product_name, console_name, image_url FROM products WHERE image_url LIKE '%googleapis%' LIMIT 500")
        products = conn.execute(markup).fetchall()
        
        print(f"Found {len(products)} products to migrate.")
        
        for p in products:
            p_id = p.id
            name = p.product_name
            console = p.console_name
            original_url = p.image_url
            
            try:
                print(f"Migrating {name}...")
                
                # SEO Filename
                seo_filename = slugify(f"{name}-{console}")
                
                # Upload
                upload_result = cloudinary.uploader.upload(
                    original_url, 
                    folder="retrocharting/products",
                    public_id=seo_filename,
                    format="webp",
                    overwrite=True
                )
                
                new_url = upload_result['secure_url']
                
                # Update DB
                update_stmt = text("UPDATE products SET image_url = :url WHERE id = :id")
                conn.execute(update_stmt, {"url": new_url, "id": p_id})
                conn.commit()
                
                print(f" -> Done: {new_url}")
                
            except Exception as e:
                print(f" -> Failed {name}: {e}")

if __name__ == "__main__":
    migrate()
