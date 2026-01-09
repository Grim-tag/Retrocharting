
import requests
from PIL import Image
from io import BytesIO
import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, not_
from app.models.product import Product
from app.core.config import settings
import logging

# Configure logging
logger = logging.getLogger(__name__)

# NOTE: Cloudinary configuration removed as we are now storing images locally in DB.

def slugify(text: str) -> str:
    """
    Creates an SEO-friendly slug from text.
    "Star Wars Jedi: Fallen Order" -> "star-wars-jedi-fallen-order"
    """
    if not text:
        return "unknown"
    
    slug = text.lower()
    # Replace specific chars
    slug = slug.replace("'", "").replace(".", "")
    # Replace non-alphanumeric with hyphen
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Trim hyphens
    slug = slug.strip('-')
    
    return slug

def migrate_product_images(db: Session, limit: int = 50):
    """
    Finds products with remote images (PriceCharting/Cloudinary) 
    and downloads them to store in the Database (BLOB).
    Updates image_url to be an SEO-friendly local URL.
    """
    # 1. Select candidates
    # - Has image_url
    # - image_blob is NULL (Not yet migrated to DB)
    # - URL is remote (http)
    # - URL is NOT already our own retrocharting.com domain
    # 1. Select simple candidates (Remote URLs)
    # We fetch more than needed to filter in memory
    candidates_query = db.query(Product).filter(
        Product.image_url != None,
        Product.image_url != "",
        Product.image_url.contains("http")
    ).limit(limit * 3).all()

    if not candidates_query:
        return {"status": "completed", "migrated": 0, "message": "No images pending migration."}

    success_count = 0
    errors = []
    
    # Base URL for our production environment
    # We force https://retrocharting.com to ensure absolute SEO URLs
    BASE_DOMAIN = "https://retrocharting.com"

    for product in candidates_query:
        if success_count >= limit:
            break
            
        # Filter in Python to avoid SQL Complexities with Blobs/NotLike
        if product.image_blob is not None:
            continue
        if "retrocharting.com" in product.image_url:
            continue

        original_url = product.image_url
        try:
            logger.info(f"Migrating image for {product.product_name} (ID: {product.id})")
            
            # 1. Download Image
            resp = requests.get(original_url, timeout=10)
            if resp.status_code != 200:
                logger.warning(f"Failed to download image from {original_url}: Status {resp.status_code}")
                # We might want to mark it as failed so we don't retry forever? 
                # For now just skip.
                errors.append(f"ID {product.id}: Download {resp.status_code}")
                continue

            # 2. Process Image (WebP + Resize)
            try:
                image = Image.open(BytesIO(resp.content))
                if image.mode in ("RGBA", "P"): image = image.convert("RGB")
                
                # Resize to max 1000x1000 to save DB space
                image.thumbnail((1000, 1000))
                
                buffer = BytesIO()
                image.save(buffer, "WEBP", quality=80)
                image_data = buffer.getvalue()
                
            except Exception as img_e:
                logger.error(f"Invalid image data for {product.id}: {img_e}")
                errors.append(f"ID {product.id}: Corrupt Image")
                continue

            # 3. Generate SEO Slug
            # "minecraft-playstation-3"
            slug_name = slugify(product.product_name)
            if product.console_name:
                slug_name += f"-{slugify(product.console_name)}"

            # 4. Update Product
            product.image_blob = image_data
            
            # Construct local URL
            # /api/v1/products/{id}/image/{slug}.webp
            new_url = f"{BASE_DOMAIN}/api/v1/products/{product.id}/image/{slug_name}.webp"
            product.image_url = new_url
            
            success_count += 1
            
        except Exception as e:
            logger.error(f"Failed to migrate image for product {product.id}: {e}")
            errors.append(f"ID {product.id}: {str(e)}")
            
    db.commit()

    return {
        "status": "partial" if success_count < len(candidates_query) else "success",
        "migrated": success_count,
        "attempted": len(candidates_query),
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
        result = migrate_product_images(db, limit)
        
        if result["migrated"] > 0:
            logger.info(f"DB-Migration: {result['migrated']} images migrated to Database.")
            
    except Exception as e:
        logger.error(f"DB-Migration Job Error: {e}")
    finally:
        db.close()
