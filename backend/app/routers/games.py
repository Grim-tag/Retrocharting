from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
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
        # Filter by console name. 
        # Note: Games have 'console_name' column or similar? 
        # Checking Game model... Game has 'console_name'.
        query = query.filter(Game.console_name == console)
        
    if genre:
        query = query.filter(Game.genre.ilike(f"%{genre}%"))
        
    # Sorting
    if sort:
        if sort == 'title_asc': query = query.order_by(Game.title.asc())
        elif sort == 'title_desc': query = query.order_by(Game.title.desc())
        
    # Eager load products to access image_url and variant count
    games = query.options(joinedload(Game.products)).offset(skip).limit(limit).all()
    
    results = []
    for g in games:
        # Resolve Image from variants
        image_url = None
        if g.products:
            # Find first check with image
            for p in g.products:
                if p.image_url:
                    image_url = p.image_url
                    break
        
        results.append({
            "id": g.id,
            "title": g.title,
            "slug": g.slug,
            "console": g.console_name,
            "image_url": image_url,
            "min_price": None, 
            "variants_count": len(g.products) if g.products else 0
        })

    return results

@router.get("/{slug}")
def get_game_by_slug(slug: str, db: Session = Depends(get_db)):
    """
    Get Unified Game Page Data.
    Aggregates data from all specific regional products (variants).
    """
    game = db.query(Game).filter(Game.slug == slug).options(joinedload(Game.products)).first()
    
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
        variants.append({
            "id": p.id,
            "region": p.variant_type or "Unknown",
            "product_name": p.product_name,
            "image": p.image_url,
            "prices": {
                "loose": p.loose_price,
                "cib": p.cib_price,
                "new": p.new_price,
                # Infer currency since Product model doesn't store it yet
                "currency": "EUR" if p.variant_type == "PAL" else "JPY" if p.variant_type == "JP" else "USD"
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
            history_data.append({
                "date": h.date.isoformat(),
                "price": h.price,
                "condition": h.condition, # loose, cib, new
                "variant": p.variant_type or "Standard", # NTSC, PAL
                "currency": p.currency
            })
            
    return history_data

@router.get("/sitemap/list", response_model=List[dict])
def sitemap_games(
    limit: int = 10000, 
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """
    Returns lightweight Game data for XML sitemap generation.
    Replaces product-based sitemap.
    """
    games = db.query(Game.slug, Game.title, Game.console_name)\
        .order_by(Game.id.asc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return [
        {
            "slug": g.slug,
            "title": g.title,
            "console": g.console_name,
            "updated_at": None # TODO
        }
        for g in games
    ]
