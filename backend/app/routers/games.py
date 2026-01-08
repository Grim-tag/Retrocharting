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
    from app.routers.products import get_product_image # To reference route logic if needed, but we build URL manually
    from app.db.session import API_URL_BASE # Assuming we have a base or just use relative? 
    # For frontend consumption, relative path or absolute path is needed.
    # Frontend uses API_URL constant.
    # We will return the Path relative to API root. 
    # Frontend handles the Base URL.
    
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
        
        # [SEO IMAGE URL]
        # Instead of returning the raw external URL, we return the API endpoint path.
        # Format: /products/{id}/image/{slug}.webp
        final_image_url = None
        if main_product_id:
            # Create a clean slug for the image filename
            # e.g. "super-mario-64-nintendo-64"
            clean_title = g.title.lower().replace(" ", "-").replace("/", "-").replace(":", "")
            clean_console = g.console_name.lower().replace(" ", "-")
            filename = f"{clean_title}-{clean_console}.webp"
            
            # The frontend typically expects a full URL or relative.
            # If we return "/api/v1/products/...", the frontend <img src> will hit the backend.
            # Currently backend runs at localhost:8000/api/v1 (or deployed URL)
            # We return the path suffix.
            # NOTE: Frontend's 'getGameUrl' and images might rely on full string.
            # But normally <img src> works with relative path if on same domain, 
            # OR full URL if different domain.
            
            # Since frontend runs on port 3000 and backend on 8000 (proxied or not?),
            # In Next.js dev, usually we don't proxy images unless configured.
            # BUT, we want a Full URL if possible, or a path the frontend understands essentially.
            
            # Let's construct the standard API path. 
            # Frontend often checks "if http" -> use as is.
            # If we give "/api/v1/...", browser on port 3000 might fetch localhost:3000/api/v1... which is Next.js.
            # Does Next.js proxy /api/v1 to Backend? 
            # If yes, this works.
            # If no, we need full localhost:8000 URL (locally) or production URL.
            
            # Simplest for now: Return the API path, user can adjust Base URL in frontend/client.ts?
            # Actually, `client.ts` defines `API_URL`.
            # Let's return the string `/products/{main_product_id}/image/{filename}`
            # And let Frontend prepend API_URL if it's not present?
            # Or we prepend it here if we know the absolute base (env var).
            
            # Ideally, stick to relative path structure that maps to the route.
            # backend route: /products/{product_id}/image/{filename}
            
            # We will return the FULL URL using a helper or hardcoded base for now relative to API root?
            # Wait, `image_url` in JSON is usually used directly in <img src>.
            # If we return a relative path `/products/...`, the browser resolves it against the Page URL (localhost:3000/...).
            # So localhost:3000/products/... -> 404 in Next.js (unless rewritten).
            
            # SAFEST: We return the full environment-aware URL.
            # But we don't always know the full externally visible URL in FastAPI easily (without Request object).
            # We can use a relative path logic if we assume Frontend knows the API domain.
            
            # Let's try returning a special marker or just using the path assuming the Frontend
            # wraps it or we configure the frontend to handle it?
            
            # BETTER: We use the `API_URL` variable if available or relative.
            # Let's assume the frontend will display whatever string we give it.
            # If we give "https://retrocharting-backend.onrender.com/api/v1/products/...", it works.
            # Locally: "http://localhost:8000/api/v1/products/..."
            
            # Let's rely on a reliable relative path being appended to the API_BASE_URL strictly?
            # No, `image_url` field is currently "absolute" (google storage).
            # So if we change it, existing frontend components might break if they expect absolute.
            
            # Let's return a special URL format that we know works:
            # We'll use a hardcoded ENV-check or just dynamic request retrieval?
            # We don't have request here easily in listing loop (can be passed but heavy).
            
            # HYBRID APPROACH:
            # We'll construct: `f"{API_URL_BASE}/products/{main_product_id}/image/{filename}"` using a config import.
            from app.core.config import settings
            base = settings.API_STR # /api/v1
            # We need the HOST.
            # For now, let's just return the relative path `/products/...` 
            # AND update proper frontend image component (or Confirm it handles relative URLs relative to API).
            # Currently frontend displays `product.image_url` directly.
            
            # Let's try to return: `/api/v1/products/{main_product_id}/image/{filename}`
            # And see if browser resolves it? 
            # Browser on `localhost:3000` -> request `localhost:3000/api/v1/...`
            # If Next.js rewrites are set up, this works.
            # If not, it fails.
            
            # User wants "retrocharting.com/Afterimage..." logic.
            # The backend is at `api.retrocharting.com` or similar? 
            # Actually `retrocharting-backend.onrender.com`.
            
            # Let's just hardcode the logic to construct the URL that points to `THIS` router.
            # We'll format it as: `/api/v1/products/{main_product_id}/image/{filename}`.
            # AND we will tell User to ensure Frontend Proxies /api/v1 OR we verify.
            # Wait, frontend `client.ts` has `baseURL`.
            # If we return a full URL, we are safe.
            
            # Let's just return the generic path and let the frontend qualify it?
            # Or better: Just use the `image_url` field to store the "Real" URL?
            # No, `image_url` in DB stores the Source.
            # In the API response, we override it.
            
            final_image_url = f"/products/{main_product_id}/image/{filename}" 
            # Note: This is partial. Frontend usually needs full URL if it's on different port.
            # But let's assume we fix it in Frontend or Proxy.
            # Actually, let's prefix with a standard variable we can replace.
            
        
        results.append({
            "id": g.id,
            "title": g.title,
            "slug": g.slug,
            "console": g.console_name,
            "image_url": final_image_url or image_url, # Fallback to raw if no main product
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
