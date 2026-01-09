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
    from app.core.config import settings
    # Construct full image URL base
    api_image_base = f"{settings.API_BASE_URL}{settings.API_V1_STR}"
    
    for g in games:
        # Resolve Image & Prices from variants
        image_url = None
        min_loose = None
        min_cib = None
        min_new = None
        
        main_product_id = None

        if g.products:
            # Sort by NTSC preference for image
            for p in g.products:
                if not image_url and (p.image_url or p.image_blob):
                    # Found a candidate image
                    image_url = p.image_url # Keep raw for now to check existence
                    main_product_id = p.id
                
                # Calculate simple min prices across all regions
                if p.loose_price and (min_loose is None or p.loose_price < min_loose):
                    min_loose = p.loose_price
                if p.cib_price and (min_cib is None or p.cib_price < min_cib):
                    min_cib = p.cib_price
                if p.new_price and (min_new is None or p.new_price < min_new):
                    min_new = p.new_price
        
        # [SEO IMAGE URL] - Full URL for frontend consumption
        # All images served from retrocharting backend, no external URLs
        final_image_url = None
        if main_product_id:
            # Create clean filename from game title and console
            clean_title = g.title.lower().replace(" ", "-").replace("/", "-").replace(":", "").replace("'", "")
            clean_console = g.console_name.lower().replace(" ", "-")
            filename = f"{clean_title}-{clean_console}.webp"
            final_image_url = f"{api_image_base}/products/{main_product_id}/image/{filename}"
            
        
        results.append({
            "id": g.id,
            "title": g.title,
            "slug": g.slug,
            "console": g.console_name,
            "image_url": final_image_url,  # Only local images, no external URLs
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
        # --- FUZZY LOOKUP FALLBACK (Legacy URLs without ID) ---
        # User requested Clean URLs: e.g. "baldurs-gate-pc-prices-value"
        # We try to parse this slug to find a Product.

        # 1. Remove Suffix
        clean_slug = slug
        known_suffixes = ['-prices-value', '-prix-cotes', '-prices', '-cote-prix']
        for suffix in known_suffixes:
            if clean_slug.endswith(suffix):
                clean_slug = clean_slug[:-len(suffix)]
                break
        
        # 2. Identify Console (Reverse Mapping)
        # We need to map slug-console (e.g. 'ps5', 'pc') back to DB Console Name ('Playstation 5', 'PC Games')
        # This map must match frontend utils.ts logic
        slug_console_map = {
            "ps5": "Playstation 5",
            "ps4": "Playstation 4",
            "ps3": "Playstation 3",
            "ps2": "Playstation 2",
            "ps1": "Playstation",
            "nes": "Nintendo Entertainment System",
            "snes": "Super Nintendo",
            "n64": "Nintendo 64",
            "gcn": "GameCube",
            "gba": "Game Boy Advance",
            "gbc": "Game Boy Color",
            "genesis": "Sega Genesis",
            "dreamcast": "Sega Dreamcast",
            "saturn": "Sega Saturn",
            "xbox-series-x": "Xbox Series X",
            "xbox-one": "Xbox One",
            "xbox-360": "Xbox 360",
            "pc": "PC Games"
        }

        found_console_real_name = None
        title_slug_part = clean_slug

        # Try to match console at end of string
        # Sort keys by length desc to match 'xbox-series-x' before 'xbox'
        sorted_keys = sorted(list(slug_console_map.keys()), key=len, reverse=True)
        
        for k in sorted_keys:
            if clean_slug.endswith(f"-{k}"):
                found_console_real_name = slug_console_map[k]
                # Extract title part (remove -console)
                title_slug_part = clean_slug[:-len(k)-1] 
                break
        
        if found_console_real_name:
            # 3. Search Product by Name/Console (Robust Normalization)
            # Since strict SQL ILIKE fails on special chars (e.g. "Baldur's" vs "baldurs"),
            # we fetch candidates and normalize in Python.
            
            # Fetch minimal fields for performance
            candidates = db.query(Product).filter(
                Product.console_name == found_console_real_name
            ).options(
                joinedload(Product.products).defer('*'), # Don't load variants yet
                defer(Product.description),
                defer(Product.image_blob),
                defer(Product.back_image_blob)
            ).all()

            # Normalize Slug: remove hyphens, lower
            norm_slug = title_slug_part.replace("-", "").lower()
            
            import re
            def normalize(s):
                return re.sub(r'[^a-z0-9]', '', (s or "").lower())

            found_product = None
            
            # Multi-pass matching for accuracy
            # Pass 1: Exact Normalized Match
            for cand in candidates:
                if normalize(cand.product_name) == norm_slug:
                    found_product = cand
                    break
            
            # Pass 2: Starts With (if no exact)
            if not found_product:
                for cand in candidates:
                    if normalize(cand.product_name).startswith(norm_slug):
                        found_product = cand
                        break
                        
            # Pass 3: Contains (last resort)
            if not found_product:
                 for cand in candidates:
                    if norm_slug in normalize(cand.product_name):
                        found_product = cand
                        break

            if found_product:
                product = found_product # Use the found product instance

            if product:
                # Wrap as Game structure
                # We mock the Game object
                clean_title = (product.product_name or "").lower().replace(" ", "-").replace("/", "-").replace(":", "")
                clean_console = (product.console_name or "").lower().replace(" ", "-")
                filename = f"{clean_title}-{clean_console}.webp"
                # Try to use existing image URL logic or simple construction
                img = f"/products/{product.id}/image/{filename}"
                if not (product.image_url or product.image_blob):
                    img = None # Or placeholder

                variant_data = {
                    "id": product.id,
                    "region": "Standard", # Legacy fallback default
                    "product_name": product.product_name,
                    "image": img,
                    "prices": {
                        "loose": product.loose_price,
                        "cib": product.cib_price,
                        "new": product.new_price,
                        "box_only": product.box_only_price,
                        "manual_only": product.manual_only_price,
                        "currency": "USD" # Default for now
                    }
                }

                return {
                    "id": 0, # Mock ID
                    "title": product.product_name,
                    "slug": slug, # Keep the requested slug
                    "console": product.console_name,
                    "description": product.description,
                    "release_date": product.release_date,
                    "developer": product.developer,
                    "publisher": product.publisher,
                    "genre": product.genre,
                    "variants": [variant_data],
                    "image_url": img
                }

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
        
        # [SEO IMAGE URL FOR VARIANT]
        variant_image = p.image_url
        if variant_image and (p.image_url or p.image_blob):
             clean_title = p.product_name.lower().replace(" ", "-").replace("/", "-").replace(":", "")
             clean_console = p.console_name.lower().replace(" ", "-")
             filename = f"{clean_title}-{clean_console}.webp"
             # Use same partial path convention
             variant_image = f"/products/{p.id}/image/{filename}"

        variants.append({
            "id": p.id,
            "region": region,
            "product_name": p.product_name, # Original name for precision
            "image": variant_image,
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
        
    # Default Image (from first variant)
    main_image = None
    if sorted_products:
        p = sorted_products[0]
        clean_title = game.title.lower().replace(" ", "-").replace("/", "-").replace(":", "")
        clean_console = game.console_name.lower().replace(" ", "-")
        filename = f"{clean_title}-{clean_console}.webp"
        main_image = f"/products/{p.id}/image/{filename}"

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
        "image_url": main_image
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
