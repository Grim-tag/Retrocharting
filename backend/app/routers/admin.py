from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.product import Product
import os

router = APIRouter()

# Simple secret key check
# In production, this should be in .env
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "admin_secret_123")

async def verify_admin_key(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid Admin Key")

@router.get("/stats", dependencies=[Depends(verify_admin_key)])
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

        return {
            "total_products": total_products,
            "scraped_products": scraped_products,
            "scraped_percentage": round(scraped_percentage, 1),
            "total_value": round(total_value, 2)
        }
    except Exception as e:
        print(f"Error producing admin stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users", dependencies=[Depends(verify_admin_key)])
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
