
import cloudinary
import cloudinary.uploader
import time
import re
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

def slugify(text: str) -> str:
    """
    Creates an SEO-friendly slug from text.
    "Star Wars Jedi: Fallen Order" -> "star-wars-jedi-fallen-order"
    """
    if not text:
        return "unknown"
    
    # 1. Lowercase
    slug = text.lower()
    
    # 2. Replace specific chars
    slug = slug.replace("'", "").replace(".", "")
    
    # 3. Replace non-alphanumeric with hyphen
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    
    # 4. Trim hyphens
    slug = slug.strip('-')
    
    return slug

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
            # SEO Filename Construction
            product_slug = slugify(product.product_name)
            public_id = f"{product_slug}-{product.id}"
            
            logger.info(f"Migrating image for {product.product_name} -> {public_id}.webp")
            
            upload_result = cloudinary.uploader.upload(
                original_url, 
                folder="retrocharting/products",
                public_id=public_id,
                format="webp",          # Force WebP
                overwrite=True,         # Deterministic ID allows overwrite
                unique_filename=False   # Keep exact name (no random chars)
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

def migrate_images_job(limit: int = 50):
    """
    Wrapper for background scheduler.
    Creates its own DB session.
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        # Check if we have work to do first to avoid log noise?
        # The service function checks `if not candidates` and returns.
        
        result = migrate_product_images(db, limit)
        
        if result["migrated"] > 0:
            logger.info(f"Auto-Migration: {result['migrated']} images migrated.")
    except Exception as e:
        logger.error(f"Auto-Migration Job Error: {e}")
    finally:
        db.close()
