from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.collection_item import CollectionItem
from app.models.product import Product
from app.routers.auth import get_current_user

router = APIRouter()

# --- Schemas ---
class CollectionItemCreate(BaseModel):
    product_id: int
    condition: str  # LOOSE, CIB, NEW, GRADED
    paid_price: Optional[float] = None
    notes: Optional[str] = None
    user_images: Optional[str] = None # JSON string of ["url1", "url2", "url3"]

class CollectionItemUpdate(BaseModel):
    condition: Optional[str] = None
    paid_price: Optional[float] = None
    notes: Optional[str] = None
    user_images: Optional[str] = None


class CollectionItemResponse(BaseModel):
    id: int
    product_id: int
    condition: str
    paid_price: Optional[float]
    paid_price: Optional[float]
    notes: Optional[str]
    user_images: Optional[str]
    # Hydrated Product Data
    product_name: str
    console_name: str
    image_url: Optional[str] = None
    
    # Value helper (not stored in DB, strictly for response)
    estimated_value: Optional[float] = None
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/", response_model=List[CollectionItemResponse])
def read_collection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(CollectionItem).filter(CollectionItem.user_id == current_user.id).all()
    
    response_items = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
            
        # simple value logic
        val = 0.0
        if item.condition == 'LOOSE': val = product.loose_price or 0
        elif item.condition == 'CIB': val = product.cib_price or 0
        elif item.condition == 'NEW': val = product.new_price or 0
        # Graded?? For now default to New price or 0? 
        # User requested Graded support in plan, but we don't have graded_price in Product model yet.
        # Let's use new_price for now as a fallback or 0.
        elif item.condition == 'GRADED': val = product.new_price or 0
        
        response_items.append({
            "id": item.id,
            "product_id": item.product_id,
            "condition": item.condition,
            "paid_price": item.paid_price,
            "notes": item.notes,
            "product_name": product.product_name,
            "console_name": product.console_name,
            "product_name": product.product_name,
            "console_name": product.console_name,
            "image_url": product.image_url,
            "estimated_value": val,
            "user_images": item.user_images
        })
        
    return response_items

@router.post("/", response_model=CollectionItemResponse)
def add_to_collection(
    item_in: CollectionItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == item_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Create item
    new_item = CollectionItem(
        user_id=current_user.id,
        product_id=item_in.product_id,
        condition=item_in.condition,
        paid_price=item_in.paid_price,
        notes=item_in.notes,
        user_images=item_in.user_images
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # Construct response manually to include hydrated fields
    val = 0.0
    if new_item.condition == 'LOOSE': val = product.loose_price or 0
    elif new_item.condition == 'CIB': val = product.cib_price or 0
    elif new_item.condition == 'NEW': val = product.new_price or 0
    elif new_item.condition == 'GRADED': val = product.new_price or 0

    return {
        "id": new_item.id,
        "product_id": new_item.product_id,
        "condition": new_item.condition,
        "paid_price": new_item.paid_price,
        "notes": new_item.notes,
        "product_name": product.product_name,
        "console_name": product.console_name,
        "image_url": product.image_url,
        "estimated_value": val,
        "user_images": new_item.user_images
    }

@router.put("/{item_id}", response_model=CollectionItemResponse)
def update_collection_item(
    item_id: int,
    item_in: CollectionItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(CollectionItem).filter(
        CollectionItem.id == item_id,
        CollectionItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item_in.condition is not None:
        item.condition = item_in.condition
    if item_in.paid_price is not None:
        item.paid_price = item_in.paid_price
    if item_in.notes is not None:
        item.notes = item_in.notes
    if item_in.user_images is not None:
        item.user_images = item_in.user_images

    db.commit()
    db.refresh(item)

    # Re-fetch product for response
    product = db.query(Product).filter(Product.id == item.product_id).first()
    
    val = 0.0
    if product:
        if item.condition == 'LOOSE': val = product.loose_price or 0
        elif item.condition == 'CIB': val = product.cib_price or 0
        elif item.condition == 'NEW': val = product.new_price or 0
        elif item.condition == 'GRADED': val = product.new_price or 0

    return {
        "id": item.id,
        "product_id": item.product_id,
        "condition": item.condition,
        "paid_price": item.paid_price,
        "notes": item.notes,
        "product_name": product.product_name if product else "Unknown",
        "console_name": product.console_name if product else "Unknown",
        "image_url": product.image_url if product else None,
        "estimated_value": val,
        "user_images": item.user_images
    }

@router.delete("/{item_id}")
def delete_collection_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(CollectionItem).filter(
        CollectionItem.id == item_id,
        CollectionItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Item deleted"}
