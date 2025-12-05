from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Response
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.product import Product as ProductModel
from app.models.price_history import PriceHistory
from app.schemas.product import Product as ProductSchema
from app.services.ebay_client import ebay_client

router = APIRouter()

@router.get("/", response_model=List[ProductSchema])
def read_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    console: Optional[str] = None,
    genre: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductModel)
    
    if search:
        query = query.filter(ProductModel.product_name.ilike(f"%{search}%"))
    if console:
        # print(f"Filtering by console: '{console}'")
        query = query.filter(ProductModel.console_name == console)
    if genre:
        query = query.filter(ProductModel.genre == genre)
        
    products = query.offset(skip).limit(limit).all()
    return products

from app.models.listing import Listing
from datetime import datetime, timedelta

from fastapi import BackgroundTasks

def update_listings_background(product_id: int):
    """
    Background task to fetch listings from eBay and update the database.
    Creates its own database session.
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
        if not product:
            return

        # Construct query: Product Name + Console
        query = f"{product.product_name} {product.console_name}"
        
        try:
            # Fetch listings from eBay
            ebay_results = ebay_client.search_items(query, limit=10, category_ids="139973")
            
            # Process and save to DB
            for item in ebay_results:
                # Check if exists
                existing = db.query(Listing).filter(
                    Listing.product_id == product_id,
                    Listing.source == 'eBay',
                    Listing.external_id == item['itemId']
                ).first()
                
                price_val = 0.0
                currency = "USD"
                if 'price' in item and 'value' in item['price']:
                    price_val = float(item['price']['value'])
                    currency = item['price']['currency']
                
                image_url = None
                if 'thumbnailImages' in item and item['thumbnailImages']:
                    image_url = item['thumbnailImages'][0]['imageUrl']

                if existing:
                    # Update
                    existing.price = price_val
                    existing.currency = currency
                    existing.title = item['title']
                    existing.url = item['itemWebUrl']
                    existing.image_url = image_url
                    existing.last_updated = datetime.utcnow()
                    existing.status = 'active'
                else:
                    # Insert
                    new_listing = Listing(
                        product_id=product_id,
                        source='eBay',
                        external_id=item['itemId'],
                        title=item['title'],
                        price=price_val,
                        currency=currency,
                        condition=item.get('condition', 'Used'),
                        url=item['itemWebUrl'],
                        image_url=image_url,
                        seller_name='eBay User',
                        status='active',
                        last_updated=datetime.utcnow()
                    )
                    db.add(new_listing)
            
            db.commit()
            print(f"Background update completed for product {product_id}")
            
        except Exception as e:
            print(f"Error in background eBay update: {e}")
            
    finally:
        db.close()

@router.get("/{product_id}/listings")
def get_product_listings(
    product_id: int, 
    background_tasks: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db)
):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        return []

    # Check for existing active listings in DB
    db_listings = db.query(Listing).filter(
        Listing.product_id == product_id,
        Listing.status == 'active'
    ).all()

    # Strategy:
    # 1. If we have listings, return them IMMEDIATELY (Cache Hit).
    # 2. If listings are stale (> 1 hour), trigger background update.
    # 3. If NO listings, we must fetch synchronously (Cache Miss).

    should_refresh = True
    if db_listings:
        # Check if the most recent update was less than 1 hour ago
        if db_listings[0].last_updated > datetime.utcnow() - timedelta(hours=1):
            should_refresh = False
        
        if should_refresh:
            print(f"Listings for {product_id} are stale. Scheduling background update.")
            background_tasks.add_task(update_listings_background, product_id)
            response.headers["X-Is-Stale"] = "true"
        
        return db_listings

    # Cache Miss: No listings at all. Must wait.
    print(f"No listings for {product_id}. Fetching synchronously.")
    # We can reuse the background logic function but run it synchronously here? 
    # Or just call it. Since it creates its own session, it's safe but slightly inefficient to open another session.
    # But for simplicity, let's just call it.
    update_listings_background(product_id)
    
    # Re-fetch from DB
    db_listings = db.query(Listing).filter(
        Listing.product_id == product_id,
        Listing.status == 'active'
    ).all()
    
    return db_listings

@router.get("/{product_id}/history")
def get_product_history(product_id: int, db: Session = Depends(get_db)):
    history = db.query(PriceHistory).filter(PriceHistory.product_id == product_id).order_by(PriceHistory.date).all()
    return history

@router.get("/{product_id}", response_model=ProductSchema)
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
