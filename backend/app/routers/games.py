from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, defer
from typing import List, Optional
from sqlalchemy import or_
from app.db.session import get_db
from app.models.game import Game
from app.models.product import Product
from app.models.price_history import PriceHistory

router = APIRouter()

@router.get("/", response_model=List[dict])
def read_games(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    console: Optional[str] = None,
    genre: Optional[str] = None,
    type: Optional[str] = None, # 'game' or 'accessory'
    sort: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    List Unified Games with filters.
    Replaces /products for Catalog Views to avoid duplicates.
    """
    query = db.query(Game)
    
    if search:
        query = query.filter(Game.title.ilike(f"%{search}%"))
        
    if console:
        query = query.filter(Game.console_name == console)
        
    if type == 'accessory':
        query = query.filter(Game.genre.in_(['Accessories', 'Controllers']))
    elif type == 'game':
        query = query.filter(Game.genre.notin_(['Accessories', 'Controllers']))
        
    if genre:
        query = query.filter(Game.genre.ilike(f"%{genre}%"))
        
    # Sorting
    if sort:
        if sort == 'title_asc': query = query.order_by(Game.title.asc())
        elif sort == 'title_desc': query = query.order_by(Game.title.desc())
        
    # Eager load products but DEFER large columns (blobs, descriptions) for performance
    games = query.options(
        joinedload(Game.products)
        .defer(Product.image_blob)
        .defer(Product.back_image_blob)
        .defer(Product.description)
    ).offset(skip).limit(limit).all()
    
    results = []
    for g in games:
        # Resolve Image & Prices from variants
        image_url = None
        min_loose = None
        min_cib = None
        min_new = None
        
        if g.products:
            # Sort by NTSC preference for image
            for p in g.products:
                if not image_url and p.image_url:
                    image_url = p.image_url
                
                # Calculate simple min prices across all regions
                if p.loose_price and (min_loose is None or p.loose_price < min_loose):
                    min_loose = p.loose_price
                if p.cib_price and (min_cib is None or p.cib_price < min_cib):
                    min_cib = p.cib_price
                if p.new_price and (min_new is None or p.new_price < min_new):
                    min_new = p.new_price
        
        results.append({
            "id": g.id,
            "title": g.title,
            "slug": g.slug,
            "console": g.console_name,
            "image_url": image_url,
            "min_price": min_loose,
            "cib_price": min_cib,
            "new_price": min_new,
            "variants_count": len(g.products) if g.products else 0,
            "genre": g.genre 
        })

    return results

@router.get("/count")
def count_games(db: Session = Depends(get_db)):
    """
    Returns total number of games.
    """
    return db.query(Game).count()

@router.get("/sitemap/list", response_model=List[dict])
def sitemap_games(
    limit: int = 10000, 
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """
    Returns lightweight Game data for XML sitemap generation.
    Includes genre to determine URL prefix (games/ vs accessories/).
    """
    games = db.query(Game.slug, Game.title, Game.console_name, Game.genre)\
        .order_by(Game.id.asc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return [
        {
            "slug": g.slug,
            "title": g.title,
            "console": g.console_name,
            "genre": g.genre,
            "updated_at": None
        }
        for g in games
    ]

@router.get("/{slug}")
def get_game_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Get Unified Game Page Data.
    Aggregates data from all specific regional products (variants).
    """
    game = db.query(Game).filter(Game.slug == slug).options(
        joinedload(Game.products)
        .defer(Product.image_blob)
        .defer(Product.back_image_blob)
        .defer(Product.description)
    ).first()
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
        
    # Aggregate Variants
    variants = []
    prices = {
        "loose": None,
        "cib": None,
        "new": None
    }
    
    # Sort products by variant preference (NTSC > PAL > JP) for default display
    sorted_products = sorted(game.products, key=lambda p: 
        1 if p.variant_type == "NTSC" else 
        2 if p.variant_type == "PAL" else 
        3 if p.variant_type == "JP" else 4
    )
    
    for p in sorted_products:
        # Dynamic Region Detection
        region = p.variant_type or "Unknown"
        if region in ["Standard", "Unknown"]:
            c_name = (p.console_name or "").upper()
            p_name = (p.product_name or "").upper()
            
            if "PAL" in c_name or "PAL" in p_name:
                region = "PAL"
            elif "JP" in c_name or "JAPAN" in c_name or "JP" in p_name:
                region = "JP"
            elif "NTSC" in c_name: # Explicit NTSC
                region = "NTSC"
            # Else remains "Standard" (which frontend treats as NTSC)

        # -- FILTERING SPECIAL EDITIONS FOR STANDARD CONSOLES --
        # User Request: Hide Bundles/Sets from "Standard" Console pages (e.g. N64 System)
        # Only apply if the MAIN GAME TITLE is "Standard" (doesn't have the keywords itself)
        is_console_game = game.genre and (game.genre.lower() in ["systems", "console", "consoles"])
        if is_console_game:
            keywords = ["bundle", "pack", "pak", "set", "edition", "limited", "ltd"]
            game_title_lower = game.title.lower()
            product_name_lower = p.product_name.lower()

            # Check if Game Title is "clean" (doesn't look like a bundle itself)
            # If Game Title mentions "Bundle", we SHOW bundles.
            # If Game Title is "Nintendo 64 System", we HIDE "Pokemon Stadium Set".
            game_has_keyword = any(k in game_title_lower for k in keywords)

            if not game_has_keyword:
                # Game is standard. Check if product is special.
                has_special_keyword = any(k in product_name_lower for k in keywords)
                if has_special_keyword:
                    continue # Skip this variant

        variants.append({
            "id": p.id,
            "region": region,
            "product_name": p.product_name, # Original name for precision
            "image": p.image_url,
            "prices": {
                "loose": p.loose_price,
                "cib": p.cib_price,
                "new": p.new_price,
                "box_only": p.box_only_price,
                "manual_only": p.manual_only_price,
                # Infer currency based on detected region
                "currency": "EUR" if region == "PAL" else "JPY" if region == "JP" else "USD"
            }
        })
        
    return {
        "id": game.id,
        "title": game.title,
        "slug": game.slug,
        "console": game.console_name,
        "description": game.description,
        "release_date": game.release_date,
        "developer": game.developer,
        "publisher": game.publisher,
        "genre": game.genre,
        "variants": variants,
        # Default Image (from first variant)
        "image_url": sorted_products[0].image_url if sorted_products else None
    }

@router.get("/{slug}/history")
def get_game_history(slug: str, db: Session = Depends(get_db)):
    """
    Get aggregated price history for the Game.
    Returns grouped history by Variant.
    """
    game = db.query(Game).filter(Game.slug == slug).options(joinedload(Game.products)).first()
    if not game: raise HTTPException(status_code=404)
    
    # We want to return history for ALL variants so the chart can toggle
    history_data = []
    
    for p in game.products:
        history = db.query(PriceHistory).filter(
            PriceHistory.product_id == p.id
        ).order_by(PriceHistory.date).all()
        
        for h in history:
            variant_type = p.variant_type or "NTSC"
            currency = "EUR" if "PAL" in variant_type else "JPY" if "JP" in variant_type else "USD"
            
            history_data.append({
                "date": h.date.isoformat(),
                "price": h.price,
                "condition": h.condition, # loose, cib, new
                "variant": variant_type, # NTSC, PAL
                "currency": currency
            })
            
    return history_data
