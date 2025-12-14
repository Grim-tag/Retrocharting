from fastapi import APIRouter, Depends, HTTPException, Header, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.db.session import get_db
from app.models.product import Product
import os

router = APIRouter()

# Simple secret key check
# In production, this should be in .env
# Simple secret key check
# In production, this should be in .env
from app.routers.auth import get_current_user, get_current_user_silent
from app.models.user import User

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "admin_secret_123")

async def get_admin_access(
    x_admin_key: str = Header(None, alias="X-Admin-Key"),
    key: str = Query(None),
    current_user: User = Depends(get_current_user_silent)
):
    # 1. Check API Key (Header)
    if x_admin_key and x_admin_key == ADMIN_SECRET_KEY:
        return True
        
    # 2. Check API Key (Query Param - for browser convenience)
    if key and key == ADMIN_SECRET_KEY:
        return True
    
    # 3. Check User Admin Status (Client-to-Service)
    if current_user and current_user.is_admin:
        return True
    
    # Fail
    raise HTTPException(status_code=403, detail="Admin Access Required")

@router.get("/stats", dependencies=[Depends(get_admin_access)])
def get_admin_stats(db: Session = Depends(get_db)):
    """
    Returns high-level statistics for the Admin Dashboard.
    """
    try:
        # Total Products
        total_products = db.query(Product).count()

        # Scraped Products (those with an image_url)
        # Assuming scrape success implies image_url is not null
        scraped_products = db.query(Product).filter(Product.image_url.isnot(None)).count()
        
        # Scraped Percentage
        scraped_percentage = (scraped_products / total_products * 100) if total_products > 0 else 0

        # Total Value (Sum of Cib Price for now, as a proxy)
        # Handle None values efficiently
        total_value_query = db.query(func.sum(Product.cib_price)).filter(Product.cib_price.isnot(None))
        total_value = total_value_query.scalar() or 0.0

        # Missing Descriptions (for IGDB enrichment tracking)
        missing_description_count = db.query(Product).filter(or_(Product.description == None, Product.description == "")).count()
        
        # Missing Details (Publisher/Developer/Genre - approximate check)
        missing_details_count = db.query(Product).filter(
            or_(
                Product.publisher == None, 
                Product.publisher == "",
                Product.developer == None,
                Product.developer == ""
            )
        ).count()

        # Pending Image Migration
        pending_image_migration_count = db.query(Product).filter(
            Product.image_url.isnot(None),
            Product.image_url != "",
            ~Product.image_url.contains("cloudinary.com")
        ).count()
        
        return {
            "total_products": total_products,
            "scraped_products": scraped_products,
            "scraped_percentage": round(scraped_percentage, 1),
            "total_value": round(total_value, 2),
            "missing_description_count": missing_description_count,
            "missing_details_count": missing_details_count,
            "pending_image_migration": pending_image_migration_count
        }
    except Exception as e:
        print(f"Error producing admin stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users", dependencies=[Depends(get_admin_access)])
def get_admin_users(db: Session = Depends(get_db)):
    """
    Returns list of users with details for Admin Dashboard.
    """
    try:
        from app.models.user import User
        users = db.query(User).order_by(User.created_at.desc()).all()
        
        return [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "rank": u.rank,
                "xp": u.xp,
                "is_admin": u.is_admin,
                "created_at": u.created_at,
                "created_at": u.created_at,
                "last_active": u.last_active,
                "ip_address": u.ip_address
            }
            for u in users
        ]
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs", dependencies=[Depends(get_admin_access)])
def get_scraper_logs(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns recent scraper/enrichment logs for debugging.
    """
    try:
        from app.models.scraper_log import ScraperLog
        logs = db.query(ScraperLog).order_by(ScraperLog.start_time.desc()).limit(limit).all()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fix-listings", dependencies=[Depends(get_admin_access)])
def trigger_listing_fix(background_tasks: BackgroundTasks):
    from app.services.listing_fixer import fix_listings_job
    background_tasks.add_task(fix_listings_job)
    return {"message": "Listing classification fix started in background."}

@router.post("/images/migrate", dependencies=[Depends(get_admin_access)])
def trigger_image_migration(
    limit: int = 50,
    background_tasks: BackgroundTasks = None, 
    db: Session = Depends(get_db)
):
    from app.services.image_migration import migrate_product_images
    
    # Run in background to avoid timeout
    if background_tasks:
         background_tasks.add_task(migrate_product_images, db, limit)
         return {"message": f"Image migration started for {limit} items."}
    else:
         # Fallback if no BG tasks (should not happen in FastAPI)
         result = migrate_product_images(db, limit)
         return result
