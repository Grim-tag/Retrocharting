from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, exists
from typing import List, Optional

from app.db.session import get_db
from app.models.product import Product as ProductModel
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.schemas.product import Product as ProductSchema
from app.services.ebay_client import ebay_client
from app.models.user import User
from app.routers.auth import get_current_admin_user

router = APIRouter()

@router.get("/", response_model=List[ProductSchema])
def read_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    console: Optional[str] = None,
    genre: Optional[str] = None,
    type: Optional[str] = None, # 'game', 'console', 'accessory'
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
        
    if type:
        if type == 'game':
             query = query.filter(ProductModel.genre.notin_(['Systems', 'Accessories', 'Controllers']))
        elif type == 'console':
             query = query.filter(ProductModel.genre == 'Systems')
        elif type == 'accessory':
             query = query.filter(ProductModel.genre.in_(['Accessories', 'Controllers']))
        
    products = query.offset(skip).limit(limit).all()
    return products

@router.get("/search/grouped", response_model=dict)
def search_products_grouped(
    query: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Returns search results grouped by Console Name/Region.
    Prioritizes Games over Accessories.
    """
    if not query or len(query) < 2:
        return {}
        
    # 1. Fetch raw matches
    sql_query = db.query(ProductModel).filter(ProductModel.product_name.ilike(f"%{query}%"))
    
    # 2. Sort Logic (Memory-based for complex grouping vs SQL)
    # Ideally SQL, but for grouping we need to fetch enough then bucket.
    raw_results = sql_query.limit(limit * 2).all() # Fetch more to sort
    
    grouped = {}
    
    # Helpers
    def get_region(p):
        name = p.console_name
        if "PAL" in name or "PAL" in p.product_name: return "EU (PAL)"
        if "Japan" in name or "JP" in name or "Famicom" in name or "Saturn" in name and "JP" in p.product_name: return "JP"
        return "US (NTSC)"

    # Sort Priority: 
    # 1. Exact Name Match
    # 2. Games vs Accessories (Amiibo/Controller down)
    # 3. Region Preference (US/EU > JP) ?? - Let's just group first.
    
    for p in raw_results:
        # Filter Amiibo/Accessories to bottom unless query explicitly asks?
        # For now, separate 'Games' vs 'Others'
        
        region = get_region(p)
        clean_console = p.console_name.replace("PAL ", "").replace("JP ", "")
        
        # Group Key: "Nintendo 64"
        key = clean_console
        
        if key not in grouped:
            grouped[key] = []
            
        p_dict = ProductSchema.from_orm(p).dict()
        p_dict['region'] = region # augment schema
        
        grouped[key].append(p_dict)
        
    # Sort within groups?
    # Sort keys?
    return grouped

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
        
        # Determine eBay Category ID based on Product Genre
        # 139971 = Video Game Consoles
        # 54968  = Video Game Accessories & Controllers
        # 139973 = Video Games (Software)
        category_id = "139973" # Default to Games
        
        if product.genre == 'Systems':
            category_id = "139971"
        elif product.genre in ['Accessories', 'Controllers']:
            category_id = "54968"
            
        try:
            # Fetch listings from eBay
            ebay_results = ebay_client.search_items(query, limit=10, category_ids=category_id)
            
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

                # Good Deal Logic
                is_good_deal = False
                if product.loose_price and price_val > 0:
                    # If listing price is < 70% of loose price, it's a good deal
                    if price_val < (product.loose_price * 0.7):
                        is_good_deal = True
                
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
                    existing.is_good_deal = is_good_deal
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
                        is_good_deal=is_good_deal,
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

from app.schemas.product import ProductUpdate

@router.put("/{product_id}", response_model=ProductSchema)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: 'User' = Depends(get_current_admin_user)
):
    """
    Update a product's details (Admin only).
    """
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    for var, value in product_update.dict(exclude_unset=True).items():
        if var == 'sales_count': continue # skip computed
        if hasattr(product, var):
            setattr(product, var, value)
            
    db.commit()
    db.refresh(product)
    # Re-calc sales count for schema
    product.sales_count = db.query(PriceHistory).filter(PriceHistory.product_id == product_id).count()
    return product

@router.get("/{product_id}", response_model=ProductSchema)
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Manually populate computed fields not in DB table but in Schema
    # Manually populate computed fields not in DB table but in Schema
    # Use PriceHistory count as a proxy for "Market Data Points" since SalesTransaction table is not yet live.
    product.sales_count = db.query(PriceHistory).filter(PriceHistory.product_id == product_id).count()
    
    return product

@router.get("/{product_id}/related", response_model=List[ProductSchema])
def get_related_products(product_id: int, db: Session = Depends(get_db)):
    current_product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not current_product:
        return []
    
    related = db.query(ProductModel).filter(
        ProductModel.product_name == current_product.product_name,
        ProductModel.id != product_id
    ).all()
@router.get("/sitemap", response_model=List[dict])
def sitemap_products(
    limit: int = 10000, 
    db: Session = Depends(get_db)
):
    """
    Returns lightweight product data for XML sitemap generation.
    Limited to top matching items to prevent timeout.
    """
    # Prefer products with images or prices as they are 'high quality' pages
    products = db.query(ProductModel.id, ProductModel.product_name, ProductModel.console_name, ProductModel.genre, ProductModel.loose_price)\
        .order_by(ProductModel.loose_price.desc().nullslast())\
        .limit(limit)\
        .all()
    
    return [
        {
            "id": p.id,
            "product_name": p.product_name,
            "console_name": p.console_name,
            "genre": p.genre,
            "updated_at": datetime.utcnow().isoformat() # We don't track update time per product yet, use now or rough estimate
        }
        for p in products
    ]

# Valid Filters
from enum import Enum
class IncompleteType(str, Enum):
    image = "image"
    description = "description"
    price = "price"
    details = "details"
    history = "history"

@router.get("/stats/health", response_model=dict)
def get_catalog_health(
    current_user: 'User' = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Returns statistics on catalog completeness (Admin only).
    """
    total = db.query(ProductModel).count()
    missing_images = db.query(ProductModel).filter(or_(ProductModel.image_url == None, ProductModel.image_url == "")).count()
    missing_desc = db.query(ProductModel).filter(or_(ProductModel.description == None, ProductModel.description == "")).count()
    # Missing price: check if loose_price is None or 0
    missing_price = db.query(ProductModel).filter((ProductModel.loose_price == None) | (ProductModel.loose_price == 0)).count()
    
    # Missing details: Publisher OR Developer is missing
    missing_details = db.query(ProductModel).filter(
        or_(
            ProductModel.publisher == None, 
            ProductModel.publisher == "",
            ProductModel.developer == None, 
            ProductModel.developer == ""
        )
    ).count()

    # Missing History: Products with NO price history entries
    # Use EXISTS for performance
    stmt_history = exists().where(PriceHistory.product_id == ProductModel.id)
    missing_history = db.query(ProductModel).filter(~stmt_history).count()
    
    # Last Activity (Max last_scraped)
    from sqlalchemy import func
    last_activity = db.query(func.max(ProductModel.last_scraped)).scalar()

    return {
        "total_products": total,
        "missing_images": missing_images,
        "missing_descriptions": missing_desc,
        "missing_prices": missing_price,
        "missing_details": missing_details,
        "missing_history": missing_history,
        "last_activity": last_activity
    }

from app.services.scraper import scrape_missing_data

@router.post("/stats/scrape")
def run_scraper(
    background_tasks: BackgroundTasks,
    current_user: 'User' = Depends(get_current_admin_user)
):
    """
    Trigger the scraper background job (Admin only).
    """
    # Run for 5 minutes in background
    background_tasks.add_task(scrape_missing_data, max_duration=300, limit=50)
    return {"status": "Scraper started in background"}

@router.get("/incomplete", response_model=List[ProductSchema])
def get_incomplete_products(
    type: IncompleteType,
    limit: int = 50,
    skip: int = 0,
    current_user: 'User' = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get list of products missing specific data.
    """
    query = db.query(ProductModel)
    
    if type == IncompleteType.image:
        query = query.filter(or_(ProductModel.image_url == None, ProductModel.image_url == ""))
    elif type == IncompleteType.description:
        query = query.filter(or_(ProductModel.description == None, ProductModel.description == ""))
    elif type == IncompleteType.price:
        query = query.filter((ProductModel.loose_price == None) | (ProductModel.loose_price == 0))
    elif type == IncompleteType.details:
        query = query.filter(
            or_(
                ProductModel.publisher == None, 
                ProductModel.publisher == "",
                ProductModel.developer == None, 
                ProductModel.developer == ""
            )
        )
    elif type == IncompleteType.history:
        stmt = exists().where(PriceHistory.product_id == ProductModel.id)
        query = query.filter(~stmt)
        
    return query.offset(skip).limit(limit).all()

# Imports moved to top
