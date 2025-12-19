from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, exists, text
from typing import List, Optional

from app.db.session import get_db
from app.models.product import Product as ProductModel
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.schemas.product import Product as ProductSchema, ProductList


from app.models.user import User
from app.routers.auth import get_current_admin_user
from app.routers.admin import get_admin_access
from app.services.igdb import igdb_service
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[ProductList])
def read_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    console: Optional[str] = None,
    genre: Optional[str] = None,
    type: Optional[str] = None, # 'game', 'console', 'accessory'
    sort: Optional[str] = None, # 'loose_asc', 'loose_desc', etc
    db: Session = Depends(get_db)
):
    # Performance Optimization: Defer 'description' as it's large and unused in List View
    from sqlalchemy.orm import defer
    query = db.query(ProductModel).options(defer(ProductModel.description))
    
    if search:
        if search.isdigit():
            query = query.filter(or_(ProductModel.product_name.ilike(f"%{search}%"), ProductModel.id == int(search)))
        else:
            query = query.filter(
                or_(
                    ProductModel.product_name.ilike(f"%{search}%"),
                    ProductModel.console_name.ilike(f"%{search}%")
                )
            )
    if console:
        query = query.filter(ProductModel.console_name == console)
    if genre:
        query = query.filter(ProductModel.genre.ilike(genre))
        
    if type:
        if type == 'game':
             query = query.filter(ProductModel.genre.notin_(['Systems', 'Accessories', 'Controllers']))
        elif type == 'console':
             query = query.filter(ProductModel.genre == 'Systems')
        elif type == 'accessory':
             query = query.filter(ProductModel.genre.in_(['Accessories', 'Controllers']))
             
    # Sorting Logic (Server Side)
    if sort:
        if sort == 'title_asc': query = query.order_by(ProductModel.product_name.asc())
        elif sort == 'title_desc': query = query.order_by(ProductModel.product_name.desc())
        elif sort == 'loose_asc': query = query.order_by(ProductModel.loose_price.asc().nullslast())
        elif sort == 'loose_desc': query = query.order_by(ProductModel.loose_price.desc().nullslast())
        elif sort == 'cib_asc': query = query.order_by(ProductModel.cib_price.asc().nullslast())
        elif sort == 'cib_desc': query = query.order_by(ProductModel.cib_price.desc().nullslast())
        elif sort == 'new_asc': query = query.order_by(ProductModel.new_price.asc().nullslast())
        elif sort == 'new_desc': query = query.order_by(ProductModel.new_price.desc().nullslast())
        
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/count", response_model=int)
def get_products_count(db: Session = Depends(get_db)):
    return db.query(ProductModel).count()



@router.get("/sitemap", response_model=List[dict])
def sitemap_products(
    limit: int = 10000, 
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """
    Returns lightweight product data for XML sitemap generation.
    Limited to top matching items to prevent timeout.
    """
    # Prefer products with images or prices as they are 'high quality' pages
    products = db.query(ProductModel.id, ProductModel.product_name, ProductModel.console_name, ProductModel.genre, ProductModel.loose_price)\
    # Sort by ID for stability and performance (Primary Key Scan)
    products = db.query(ProductModel.id, ProductModel.product_name, ProductModel.console_name, ProductModel.genre, ProductModel.loose_price)\
        .order_by(ProductModel.id.asc())\
        .offset(skip)\
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

@router.get("/genres", response_model=List[str])
def get_genres(
    console: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get list of unique genres. 
    Optional: Filter by console to show only relevant genres.
    """
    query = db.query(ProductModel.genre).filter(ProductModel.genre != None, ProductModel.genre != "")
    
    if console:
        query = query.filter(ProductModel.console_name == console)
        
    genres = query.distinct().order_by(ProductModel.genre).all()
    # Flatten list of tuples [('Action',), ('Adventure',)] -> ['Action', 'Adventure']
    return [g[0] for g in genres]

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

from app.services.pricing_service import PricingService

def update_listings_background(product_id: int):
    """
    Background task to fetch listings via PricingService.
    Now just a wrapper to keep the router clean.
    """
    PricingService.update_listings(product_id)



def enrich_product_with_igdb(product_id: int):
    """
    Background task to fetch details from IGDB and update the product.
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
        if not product:
            return

        print(f"IGDB: Attempting to enrich {product.product_name}...")
        
        # 1. Search for game
        # Clean name logic? Remove [PAL] [JP] etc?
        search_query = product.product_name
        # Simple cleanup
        for term in ['[PAL]', '[JP]', '[NTSC]', 'PAL', 'NTSC-U', 'NTSC-J']:
             search_query = search_query.replace(term, '').strip()

        games = igdb_service.search_game(search_query)
        if not games:
            print(f"IGDB: No match found for {search_query}")
            return

        # Simple matching strategy: Take the first result or closest release date?
        # For now, take first.
        match = games[0]
        game_id = match['id']
        
        # 2. Get Details
        details = igdb_service.get_game_details(game_id)
        if not details:
            return
            
        # 3. Update Product
        updated = False
        
        if not product.description and 'summary' in details:
            product.description = details['summary']
            updated = True
            
        if not product.release_date and 'first_release_date' in details:
            # IGDB returns timestamp
            ts = details['first_release_date']
            product.release_date = datetime.fromtimestamp(ts)
            updated = True
            
        if (not product.genre or product.genre == 'Unknown') and 'genres' in details:
            # "Action, Adventure" -> "Action & Adventure"
            genre_names = [g['name'] for g in details['genres']]
            
            final_genre = "Unknown"
            
            # Taxonomy Mapping (IGDB -> PriceCharting)
            if "Role-playing (RPG)" in genre_names:
                final_genre = "RPG"
            elif "Action" in genre_names or "Adventure" in genre_names:
                 final_genre = "Action & Adventure"
            elif "Fighting" in genre_names:
                 final_genre = "Fighting"
            elif "Platform" in genre_names:
                 final_genre = "Platformer"
            elif "Shooter" in genre_names:
                 final_genre = "FPS"
            elif "Racing" in genre_names:
                 final_genre = "Racing"
            elif "Sport" in genre_names:
                 final_genre = "Sports"
            elif "Strategy" in genre_names or "Real Time Strategy (RTS)" in genre_names or "Turn-based strategy (TBS)" in genre_names:
                 final_genre = "Strategy"
            elif "Simulator" in genre_names:
                 final_genre = "Simulation"
            elif "Puzzle" in genre_names:
                 final_genre = "Puzzle"
            elif "Arcade" in genre_names:
                 final_genre = "Arcade"
            else:
                 # Fallback to first available or standard join
                 final_genre = genre_names[0] if genre_names else "Unknown"

            product.genre = final_genre
            updated = True
            
        # Developer / Publisher
        if 'involved_companies' in details:
            companies = details['involved_companies']
            pub = [c['company']['name'] for c in companies if c.get('publisher', False)]
            dev = [c['company']['name'] for c in companies if c.get('developer', False)]
            
            if (not product.publisher) and pub:
                product.publisher = pub[0] # Take first
                updated = True
            
            if (not product.developer) and dev:
                product.developer = dev[0]
                updated = True
                
        # ESRB Rating
        # IGDB Rating Enum: 6=RP, 7=EC, 8=E, 9=E10+, 10=T, 11=M, 12=AO
        if not product.esrb_rating and 'age_ratings' in details:
            esrb_map = {8: "E", 9: "E10+", 10: "T", 11: "M", 12: "AO", 7: "EC", 6: "RP"}
            for r in details['age_ratings']:
                if r.get('category') == 1: # ESRB
                    rating_id = r.get('rating')
                    if rating_id in esrb_map:
                        product.esrb_rating = esrb_map[rating_id]
                        updated = True
                        break

        # Players
        if not product.players:
            # Try multiplayer modes first for exact numbers
            if 'multiplayer_modes' in details:
                # Find max players
                max_players = 1
                for mode in details['multiplayer_modes']:
                    off = mode.get('offlinemax', 0)
                    on = mode.get('onlinemax', 0)
                    coop = mode.get('offlinecoopmax', 0)
                    max_players = max(max_players, off, on, coop)
                
                if max_players > 1:
                    product.players = str(max_players)
                    updated = True
            
            # Fallback to game modes if "Single player" only
            if not product.players and 'game_modes' in details:
                modes = [m['name'] for m in details['game_modes']]
                if "Multiplayer" in modes or "Co-operative" in modes:
                    # If we didn't get a number from multiplayer_modes but it says multiplayer... invalid?
                    # Let's just leave it blank or default/guess? 
                    # Actually if we fail to get a number, 1 is safer or "1-2"?
                    pass
                elif "Single player" in modes:
                    product.players = "1"
                    updated = True

        if updated:
            db.commit()
            print(f"IGDB: Successfully enriched {product.product_name}")
        else:
            print(f"IGDB: Data found but no fields needed update for {product.product_name}")

    except Exception as e:
        print(f"IGDB Enrichment Error: {e}")
    finally:
        db.close()

@router.get("/{product_id}/listings")
def get_product_listings(
    product_id: int, 
    background_tasks: BackgroundTasks,
    response: Response,
    force: bool = False,
    db: Session = Depends(get_db)
):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        return []

    if force:
        from fastapi import status
        print(f"Force refresh requested for {product_id}. Triggering background fetch.")
        background_tasks.add_task(update_listings_background, product_id)
        response.status_code = status.HTTP_202_ACCEPTED
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
        # Check if the most recent update was less than 15 minutes ago
        # Use max() to get the freshest timestamp from the set
        latest_update = max(l.last_updated for l in db_listings)
        if latest_update > datetime.utcnow() - timedelta(minutes=15):
            should_refresh = False
        
        if should_refresh:
            print(f"Listings for {product_id} are stale. Scheduling background update.")
            background_tasks.add_task(update_listings_background, product_id)
            response.headers["X-Is-Stale"] = "true"
        
        return db_listings

    # Cache Miss: No listings at all. Must wait.
    # ASYNC OPTIMIZATION: Do NOT wait. Return 202 (Accepted) and trigger background fetch.
    from fastapi import status
    print(f"No listings for {product_id}. Triggering background fetch (Async).")
    background_tasks.add_task(update_listings_background, product_id)
    
    response.status_code = status.HTTP_202_ACCEPTED
    return []

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
def read_product(
    product_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Trigger Auto-Enrichment if description is missing
    # RATE LIMIT: Only try once every 24 hours to prevent bot-induced threadpool exhaustion.
    from datetime import datetime, timedelta
    should_enrich = False
    if not product.description or len(product.description) < 10:
        if not product.last_scraped or product.last_scraped < datetime.utcnow() - timedelta(hours=24):
            should_enrich = True
    
    if should_enrich:
        background_tasks.add_task(enrich_product_with_igdb, product_id)
        
    # Manually populate computed fields not in DB table but in Schema
    # Use PriceHistory count as a proxy for "Market Data Points" since SalesTransaction table is not yet live.
    product.sales_count = db.query(PriceHistory).filter(PriceHistory.product_id == product_id).count()
    
    return product

@router.get("/{product_id}/image", include_in_schema=False)
@router.get("/{product_id}/image/{filename}")
def get_product_image(
    product_id: int,
    filename: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Serves the product image directly from the Database (BLOB).
    Supports SEO-friendly filenames (ignored logic-wise, used for display).
    """
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        return Response(status_code=404)
        
    if product.image_blob:
        # Suggest filename if not provided
        if not filename:
             # Basic slugify if we need to generate it on fly, strictly strictly not needed if URL has it
             filename = f"product-{product_id}.webp"
             
        return Response(content=product.image_blob, media_type="image/webp", headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'inline; filename="{filename}"'
        })
        
    # Fallback to external URL if blob is missing but URL exists
    # Prevent loop if URL points to self
    if product.image_url and "retrocharting" not in product.image_url and "localhost" not in product.image_url:
         from fastapi.responses import RedirectResponse
         return RedirectResponse(product.image_url)
         
    return Response(status_code=404)

@router.get("/{product_id}/related", response_model=List[ProductSchema])
def get_related_products(product_id: int, db: Session = Depends(get_db)):
    current_product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not current_product:
        return []
    
    related = db.query(ProductModel).filter(
        ProductModel.product_name == current_product.product_name,
        ProductModel.id != product_id
    ).all()
    return related


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
    # Run for 5 minutes in background (300s)
    background_tasks.add_task(scrape_missing_data, max_duration=300, limit=10)
    return {"status": "Scraper started in background"}

from app.models.scraper_log import ScraperLog

@router.get("/stats/scraper/status")
def get_scraper_status(
    current_user: 'User' = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get the latest scraper log entry to determine status.
    """
    latest = db.query(ScraperLog).order_by(ScraperLog.start_time.desc()).first()
    if not latest:
        return {"status": "idle", "items_processed": 0, "start_time": None}
    
    # Check if 'running' but too old (stuck/crashed)
    import datetime
    
    # If currently running but started > 10 minutes ago (limit is 5m), assume crashed
    timeout_threshold = datetime.timedelta(minutes=10)
    if latest.status == "running" and (datetime.datetime.utcnow() - latest.start_time) > timeout_threshold:
        # We can auto-update it to error in DB? Or just report 'error' to frontend?
        # Let's report 'error' so frontend enables the button.
        # Ideally we update DB too so it stays fixed.
        latest.status = "error"
        latest.error_message = "Process timed out or crashed (Zombie job)."
        latest.end_time = datetime.datetime.utcnow()
        db.commit() # Fix it permanently
    
    return {
        "status": latest.status,
        "items_processed": latest.items_processed,
        "start_time": latest.start_time,
        "end_time": latest.end_time,
        "error_message": latest.error_message
    }

@router.post("/maintenance/fix-prices")
def fix_price_scaling(
    current_user: 'User' = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Emergency Maintenance Tool: Fixes inflated prices (>500) by dividing by 100.
    Executes in batches to avoid database deadlocks.
    """
    total_fixed = 0
    batch_size = 100000 # Update 100k rows at a time
    
    try:
        while True:
            # Postgres subquery limit for chunking
            # Update a batch of rows that need fixing
            stmt = text(f"""
                UPDATE price_history 
                SET price = price / 100.0 
                WHERE id IN (
                    SELECT id FROM price_history 
                    WHERE price > 500 
                    LIMIT {batch_size}
                )
            """)
            result = db.execute(stmt)
            db.commit() # Commit to release lock for this batch
            
            count = result.rowcount
            total_fixed += count
            
            # If we updated fewer than batch_size, we are done
            if count < batch_size:
                break
                
        return {"status": "success", "affected_rows": total_fixed, "message": f"Fixed {total_fixed} inflated price records."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/recently-scraped", response_model=List[ProductSchema])
def get_recently_scraped(
    limit: int = 10,
    current_user: 'User' = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get list of products that were most recently scraped/updated.
    """
    products = db.query(ProductModel).filter(ProductModel.last_scraped != None).order_by(ProductModel.last_scraped.desc()).limit(limit).all()
    return products


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

@router.api_route("/admin/enrich-all", methods=["GET", "POST"])
def trigger_mass_enrichment(
    limit: int = 100,
    background_tasks: BackgroundTasks = None,
    auth: bool = Depends(get_admin_access)
):
    """
    Triggers a background job to enrich missing product data using IGDB.
    Uses the robust job service with logging.
    Supports GET (browser) and POST (curl).
    """
    from app.services.enrichment import enrichment_job
    # 600 seconds duration limit (10 mins) per batch call
    background_tasks.add_task(enrichment_job, max_duration=600, limit=limit)
    return {"status": "started", "message": f"Enriching up to {limit} products in background (Robust Job)."}

# Imports moved to top
