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
from app.routers.auth import get_current_user, get_current_user_silent, get_current_admin_user
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

@router.get("/maintenance/fix-genres")
def fix_pc_genres_endpoint(
    current_user: 'User' = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Standardize PC Games genres to match Console taxonomy.
    Examples: "Action, Adventure" -> "Action & Adventure", "Shooter" -> "FPS".
    """
    products = db.query(Product).filter(Product.console_name == "PC Games").all()
    updated_count = 0
    
    for p in products:
        original = p.genre
        if not original or original == "Unknown":
            continue
            
        new_genre = original
        
        # Comma separated list from previous enrichment?
        if "," in original:
             parts = [x.strip() for x in original.split(",")]
             
             if "Action" in parts or "Adventure" in parts:
                 new_genre = "Action & Adventure"
             elif "Role-playing (RPG)" in parts or "RPG" in parts:
                 new_genre = "RPG"
             elif "Shooter" in parts or "FPS" in parts:
                 new_genre = "FPS"
             elif "Platform" in parts:
                 new_genre = "Platformer"
             elif "Strategy" in parts:
                 new_genre = "Strategy"
             elif "Fighting" in parts:
                 new_genre = "Fighting"
             elif "Racing" in parts:
                 new_genre = "Racing"
             else:
                 new_genre = parts[0]
        
        # Simple mappings
        mapping = {
            "Shooter": "FPS",
            "Role-playing (RPG)": "RPG",
            "Platform": "Platformer",
            "Adventure": "Action & Adventure",
            "Action": "Action & Adventure",
            "Real Time Strategy (RTS)": "Strategy",
            "Turn-based strategy (TBS)": "Strategy",
            "Fighting": "Fighting",
            "Racing": "Racing",
            "Sport": "Sports",
            "Simulator": "Simulation"
        }
        
        if new_genre in mapping:
            new_genre = mapping[new_genre]

        if new_genre != original:
            p.genre = new_genre
            updated_count += 1
            
    db.commit()
    return {"status": "success", "fixed_count": updated_count}

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

@router.post("/db/migrate", dependencies=[Depends(get_admin_access)])
def migrate_db_schema(db: Session = Depends(get_db)):
    """
    Manual Schema Migration to add missing columns.
    """
    from sqlalchemy import text
    try:
        # Add new columns if they don't exist
        # Postgres 9.6+ supports IF NOT EXISTS
        commands = [
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS ean VARCHAR",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS asin VARCHAR",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin VARCHAR",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS publisher VARCHAR",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS developer VARCHAR",
        ]
        
        results = []
        for cmd in commands:
            try:
                db.execute(text(cmd))
                results.append(f"Success: {cmd}")
            except Exception as e:
                # If using older Postgres, IF NOT EXISTS might fail? 
                # Or just duplicate column error.
                # We catch to allow others to proceed.
                results.append(f"Skipped: {cmd} -> {str(e)}")
                # In SQLAlchemy, if an error occurs in a transaction, we might need to rollback before next command?
                # Actually, standard execute might invalidate transaction.
                # Ideally we run separate transactions or rely on savepoints.
                # But here, we'll try just rollback and continue if possible, or just fail fast.
                # Actually, `IF NOT EXISTS` should prevent errors. 
                # If error happens, it's likely something else.
                db.rollback() 
                
        db.commit()
        return {"status": "success", "log": results}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/populate-pc-games", dependencies=[Depends(get_admin_access)])
def populate_pc_games(limit: int = 50, background_tasks: BackgroundTasks = None, db: Session = Depends(get_db)):
    """
    Triggers scraping of PC Games.
    If limit > 50, runs in background to prevent timeout.
    """
    from app.services.pc_games_scraper import scrape_pc_games_service, scrape_pc_games_bg_wrapper
    
    if limit > 50:
        background_tasks.add_task(scrape_pc_games_bg_wrapper, limit)
        return {"status": "success", "message": f"Background job started to scrape {limit} items. Operations will continue in the background."}
    else:
        # Sync mode for small batches (immediate feedback)
        result = scrape_pc_games_service(db, limit)
        return result
