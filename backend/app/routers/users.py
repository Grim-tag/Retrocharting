
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.user import User
from app.models.collection_item import CollectionItem
from app.models.product import Product
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class PublicUserSchema(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    rank: str = "Loose"
    xp: int = 0
    created_at: datetime
    bio: Optional[str] = None
    is_collection_public: bool = False
    
    class Config:
        from_attributes = True

class PublicCollectionItemSchema(BaseModel):
    product_name: str
    console_name: str
    image_url: Optional[str]
    condition: str
    product_id: int
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/{username}", response_model=PublicUserSchema)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    # Case insensitive search
    user = db.query(User).filter(User.username.ilike(username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.get("/{username}/collection", response_model=List[PublicCollectionItemSchema])
def get_user_public_collection(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username.ilike(username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check Privacy
    if not user.is_collection_public:
        # We return 403 Forbidden effectively saying "This collection is private"
        raise HTTPException(status_code=403, detail="This user's collection is private.")
    
    items = db.query(CollectionItem)\
        .options(joinedload(CollectionItem.product))\
        .filter(CollectionItem.user_id == user.id)\
        .all()
    
    results = []
    for item in items:
        if item.product:
            results.append({
                "product_name": item.product.product_name,
                "console_name": item.product.console_name,
                "image_url": item.product.image_url,
                "condition": item.condition,
                "product_id": item.product.id
            })
            
    return results

