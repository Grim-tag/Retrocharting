from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, exists, text
from typing import List, Optional

from app.db.session import get_db
from app.models.product import Product as ProductModel
from app.models.price_history import PriceHistory
from app.models.sales_transaction import SalesTransaction
from app.schemas.product import Product as ProductSchema
from app.services.ebay_client import ebay_client
from app.models.user import User
from app.services.ebay_client import ebay_client
from app.models.user import User
from app.routers.auth import get_current_admin_user
from app.routers.admin import get_admin_access
from app.services.igdb import igdb_service
from app.services.amazon_client import amazon_client
from datetime import datetime

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
        query = query.filter(ProductModel.genre.ilike(genre))
        
    if type:
        if type == 'game':
             query = query.filter(ProductModel.genre.notin_(['Systems', 'Accessories', 'Controllers']))
        elif type == 'console':
             query = query.filter(ProductModel.genre == 'Systems')
        elif type == 'accessory':
             query = query.filter(ProductModel.genre.in_(['Accessories', 'Controllers']))
        
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
        .order_by(ProductModel.loose_price.desc().nullslast())\
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
            # For Amazon/eBay systems, simpler is better: "Nintendo 64 Console"
            # Avoids "Action Set", "Pack", "Edition" which kill results on Amazon
            if product.console_name in product.product_name:
                 # If product is "Nintendo NES Action Set", query -> "Nintendo NES Console"
                 query = f"{product.console_name} Console"
            else:
                 query = f"{product.console_name} Console" # Default fallback
        elif product.genre in ['Accessories', 'Controllers']:
            category_id = "54968"
            query = f"{product.product_name} {product.console_name}" # Keep specific
        else:
             query = f"{product.product_name} {product.console_name}" # Games need specificity
            
        # Helper for Classification
        def classify_item(title: str, default_cond: str) -> str:
            t = title.lower()
            
            # 1. Junk / Parts
            if any(x in t for x in ['repro', 'mod', 'hs', 'for parts', 'broken', 'defective', 'junk', 'non fonctionnel']):
                return 'PARTS'
            
            # 2. Box Only
            # Expanded regex-like checks
            if any(x in t for x in ['box only', 'boite seule', 'boîte seule', 'empty box', 'case only', 'boitier seul', 'boîte vide', 'boite vide']):
                return 'BOX_ONLY'
            
            # 3. Manual Only
            if any(x in t for x in ['manual only', 'notice seule', 'booklet only', 'insert only', 'notice only', 'manuel seul']):
                return 'MANUAL_ONLY'

            # 4. Strict "Notice" or "Boite" detection if it starts with it or is prominent?
            # User example: "NOTICE Super Mario 64..."
            if 'notice' in t and ('jeu' not in t and 'game' not in t):
                 return 'MANUAL_ONLY'
            if ('boite' in t or 'boîte' in t) and ('jeu' not in t and 'game' not in t and 'console' not in t):
                 return 'BOX_ONLY'

            return default_cond

        try:
            # Parallel Fetching (eBay + Amazon)
            from concurrent.futures import ThreadPoolExecutor
            
            ebay_results = []
            amazon_results = []
            
            def fetch_ebay():
                return ebay_client.search_items(query, limit=20, category_ids=category_id)
                
            def fetch_amazon():
                try:
                    # Amazon is sensitive to extra words like "PAL", "JP"
                    # Create a cleaner query for Amazon
                    clean_query = query.replace("PAL", "").replace("JP", "").replace("NTSC", "").replace("  ", " ").strip()
                    raw_results = amazon_client.search_items(clean_query, limit=10)
                    
                    # RELEVANCE FILTERING
                    # Amazon Search is "fuzzy", so we must filter out junk (Lexibook, Generic, etc.)
                    filtered = []
                    
                    # Key terms from Console Name (e.g. "Nintendo 64" -> ["nintendo", "64"])
                    # We require at least one specific console term to be present
                    console_terms = [t.lower() for t in product.console_name.split() if len(t) > 2]
                    
                    # Also product name terms
                    prod_terms = [t.lower() for t in product.product_name.split() if len(t) > 3]

                    for item in raw_results:
                        title_lower = item['title'].lower()
                        
                        # 1. Check Console Match (Critical)
                        # If the product is for "Nintendo 64", the result MUST mention "64" or "Nintendo"
                        # For NES ("Nintendo NES"), must mention "NES" or "Nintendo"
                        # But Lexibook doesn't mention either properly usually.
                        
                        # Exception: "Lexibook" is explicitly junk for us?
                        if "lexibook" in title_lower:
                            continue
                            
                        # SYSTEM FILTERING: Remove accessories masquerading as consoles
                        # (Only applies if we are looking for a System/Console)
                        if product.genre == 'Systems':
                            bad_terms = [
                                "cable", "câble", "adaptateur", "adapter", "case", "housse", "sacoche", 
                                "fan", "ventilateur", "sticker", "skin", "controller", "manette", "pad", 
                                "chargeur", "charger", "alim", "power", "supply", "part", "pièce", "button", "bouton"
                            ]
                            if any(bad in title_lower for bad in bad_terms):
                                continue

                        # Simple Check: Overlap Score
                        # Count how many console terms are in the title
                        match_count = sum(1 for term in console_terms if term in title_lower)
                        if match_count == 0 and len(console_terms) > 0:
                            # Verify if maybe it uses an Acronym? (PS5 vs Playstation 5)
                            # For now, let's just trust console_terms.
                            # If product is NES, terms=["nintendo", "nes"] -> Result Lexibook (0 matches) -> Drop.
                            continue

                        filtered.append(item)
                        
                    return filtered

                except Exception as e:
                    print(f"Amazon Fetch Error: {e}")
                    return []

            with ThreadPoolExecutor(max_workers=2) as executor:
                future_ebay = executor.submit(fetch_ebay)
                future_amazon = executor.submit(fetch_amazon)
                
                try:
                    ebay_results = future_ebay.result(timeout=10)
                except Exception as e:
                    print(f"eBay Future Error: {e}")
                    
                try:
                    amazon_results = future_amazon.result(timeout=10)
                except Exception as e:
                    print(f"Amazon Future Error: {e}")

            # Accumulators for average calculation
            prices_box = []
            prices_manual = []
            prices_loose = []
            
            # --- PROCESS EBAY ---
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
                
                # CLASSIFY
                base_cond = item.get('condition', 'Used')
                condition_code = classify_item(item['title'], base_cond)
                
                # Good Deal Logic
                is_good_deal = False
                if condition_code == 'MANUAL_ONLY' and product.manual_only_price and price_val > 0:
                    if price_val < (product.manual_only_price * 0.8):
                        is_good_deal = True
                elif condition_code == 'BOX_ONLY' and product.box_only_price and price_val > 0:
                     if price_val < (product.box_only_price * 0.8):
                        is_good_deal = True
                elif condition_code not in ['PARTS', 'BOX_ONLY', 'MANUAL_ONLY']:
                     if product.loose_price and price_val > 0:
                        if price_val < (product.loose_price * 0.7):
                            is_good_deal = True
                
                # Collect prices
                if price_val > 0:
                    if condition_code == 'BOX_ONLY': prices_box.append(price_val)
                    elif condition_code == 'MANUAL_ONLY': prices_manual.append(price_val)
                    elif condition_code not in ['PARTS']: prices_loose.append(price_val)

                image_url = None
                if 'thumbnailImages' in item and item['thumbnailImages']:
                    image_url = item['thumbnailImages'][0]['imageUrl']

                if existing:
                    existing.price = price_val
                    existing.title = item['title']
                    existing.condition = condition_code 
                    existing.is_good_deal = is_good_deal
                    existing.last_updated = datetime.utcnow()
                    existing.status = 'active'
                else:
                    new_listing = Listing(
                        product_id=product_id,
                        source='eBay',
                        external_id=item['itemId'],
                        title=item['title'],
                        price=price_val,
                        currency=currency,
                        condition=condition_code,
                        url=item['itemWebUrl'],
                        image_url=image_url,
                        seller_name='eBay User',
                        status='active',
                        is_good_deal=is_good_deal,
                        last_updated=datetime.utcnow()
                    )
                    db.add(new_listing)

            # --- PROCESS AMAZON ---
            for item in amazon_results:
                existing = db.query(Listing).filter(
                    Listing.product_id == product_id,
                    Listing.source == 'Amazon',
                    Listing.external_id == item['asin']
                ).first()
                
                is_good_deal = False
                # Simple deal logic for Amazon: lower than avg loose?
                if product.loose_price and item['price'] > 0:
                    if item['price'] < (product.loose_price * 0.8):
                        is_good_deal = True

                if existing:
                    existing.price = item['price']
                    existing.title = item['title']
                    existing.last_updated = datetime.utcnow()
                    existing.status = 'active'
                    existing.image_url = item['image']
                    existing.is_good_deal = is_good_deal
                else:
                    new_listing = Listing(
                        product_id=product_id,
                        source='Amazon',
                        external_id=item['asin'],
                        title=item['title'],
                        price=item['price'],
                        currency=item['currency'],
                        condition=item['condition'], # 'New' usually
                        url=item['link'],
                        image_url=item['image'],
                        seller_name='Amazon',
                        status='active',
                        is_good_deal=is_good_deal,
                        last_updated=datetime.utcnow()
                    )
                    db.add(new_listing)

            
            # Update Product averages for Box/Manual if we found new data
            if prices_box:
                avg_box = sum(prices_box) / len(prices_box)
                product.box_only_price = avg_box
            if prices_manual:
                avg_man = sum(prices_manual) / len(prices_manual)
                product.manual_only_price = avg_man
                
            db.commit()
            print(f"Background update completed for product {product_id}. Listings refreshed.")
            
        except Exception as e:
            print(f"Error in background eBay update: {e}")
            
    finally:
        db.close()

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
            # "Action, Adventure"
            genre_list = [g['name'] for g in details['genres']]
            product.genre = ", ".join(genre_list)
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
    ).order_by(Listing.price.asc()).all()
    
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
def read_product(
    product_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Trigger Auto-Enrichment if description is missing
    # We check if we already tried recently? (Maybe add a last_enriched flag later)
    # For now, if description is empty, try to fetch it.
    if not product.description or len(product.description) < 10:
        background_tasks.add_task(enrich_product_with_igdb, product_id)
        
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
