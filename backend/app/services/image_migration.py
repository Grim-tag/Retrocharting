
import cloudinary
import cloudinary.uploader
import time
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.product import Product
from app.core.config import settings
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Verify Config
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET,
  secure = True
)

def migrate_product_images(db: Session, limit: int = 50):
    """
    Finds products with non-Cloudinary images and uploads them to Cloudinary.
    """
    # 1. Select candidates
    # Image URL exists AND does NOT contain 'cloudinary'
    candidates = db.query(Product).filter(
        Product.image_url != None,
        Product.image_url != "",
        ~Product.image_url.contains("cloudinary.com")
    ).limit(limit).all()

    if not candidates:
        return {"status": "completed", "migrated": 0, "message": "No images pending migration."}

    success_count = 0
    errors = []

    for product in candidates:
        original_url = product.image_url
        try:
            # Upload to Cloudinary
            # folder="retrocharting/products"
            # We can use the product ID as public_id for cleaner URLs if desired, but auto is safer to avoid collisions if not careful.
            
            logger.info(f"Migrating image for {product.bread_name}: {original_url}")
            
            upload_result = cloudinary.uploader.upload(
                original_url, 
                folder="retrocharting/products",
                public_id=f"product_{product.id}_{int(time.time())}", # unique ID
                overwrite=True
            )
            
            new_url = upload_result['secure_url']
            
            # Update DB
            product.image_url = new_url
            success_count += 1
            
        except Exception as e:
            logger.error(f"Failed to migrate image for product {product.id}: {e}")
            errors.append(f"ID {product.id}: {str(e)}")
            
    db.commit()

    return {
        "status": "partial" if success_count < len(candidates) else "success",
        "migrated": success_count,
        "attempted": len(candidates),
        "errors": errors
    }
