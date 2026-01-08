
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db.session import get_db
from app.services.vinted_client import vinted_client
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.sniper import SniperQuery, SniperWatch, SniperResult
from app.schemas.sniper import SniperWatchCreate, SniperWatchOut, SniperResultOut

router = APIRouter()

# Helper to normalize query
def normalize_query(q: str):
    return q.strip().lower()

@router.get("/search/vinted", response_model=Dict[str, Any])
def search_vinted(
    query: str, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    """
    Smart Search: Checks DB Cache first. If stale (>15mins), scrapes Vinted and caches results.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    q_norm = normalize_query(query)
    
    # 1. Check Cache
    db_query = db.query(SniperQuery).filter(SniperQuery.query_text == q_norm).first()
    
    # Define "Stale" threshold (e.g. 15 minutes)
    is_stale = True
    if db_query and db_query.last_scraped_at:
        age = datetime.utcnow() - db_query.last_scraped_at
        if age < timedelta(minutes=15):
            is_stale = False
            
    # 2. Return Cache if Fresh
    if not is_stale and db_query:
        print(f"CACHE HIT for '{q_norm}'")
        cached_results = db.query(SniperResult).filter(SniperResult.query_id == db_query.id).order_by(SniperResult.created_at.desc()).limit(limit).all()
        # Convert to response format
        return {
            "success": True, 
            "items": [
                {
                    "id": r.external_id, 
                    "title": r.title, 
                    "price": r.price,
                    "currency": r.currency,
                    "url": r.url,
                    "image_url": r.image_url,
                    "is_cached": True,
                    "is_potential_deal": r.is_potential_deal
                } for r in cached_results
            ],
            "debug": {"source": "database_cache", "age_seconds": int(age.total_seconds())}
        }

    # 3. Cache Miss or Stale -> Scrape
    print(f"CACHE MISS/STALE for '{q_norm}' (Stale={is_stale})")
    scrape_resp = vinted_client.search(query, limit)
    raw_items = scrape_resp.get("items", [])
    debug_info = scrape_resp.get("debug", {})
    
    if not raw_items and "error" in debug_info:
         return {"success": False, "error": debug_info.get("error"), "debug": debug_info}
         
    # 4. Save to DB
    if not db_query:
        db_query = SniperQuery(query_text=q_norm, last_scraped_at=datetime.utcnow())
        db.add(db_query)
        db.commit()
        db.refresh(db_query)
    else:
        db_query.last_scraped_at = datetime.utcnow()
        db.add(db_query)
    
    saved_count = 0
    response_items = []
    
    for item in raw_items:
        try:
            ext_id = str(item['id'])
            # Check if exists to avoid dupes in this query context
            # Note: We rely on external_id + query_id unicity or cleanups?
            # Vinted IDs are unique globally usually. But lets check.
            # Using merge or check existing.
            
            existing = db.query(SniperResult).filter(
                SniperResult.query_id == db_query.id, 
                SniperResult.external_id == ext_id
            ).first()
            
            price_val = float(item.get('price', {}).get('amount', 0))
            
            # Match Product in DB to get market price
            # Heuristic: Try to find a product where the name is extremely similar
            # For efficiency, we only search if we have a title.
            
            market_price = None
            potential_product = None
            is_deal = False # RESET STATE for each item!
            
            # Simple normalization for matching
            clean_title = item['title'].lower().replace("video game", "").strip()
            
            # Try 1: Exact / ILIKE match
            # We assume the Vinted title contains the Product Name (e.g. "Super Mario 64 Nintendo")
            # This is hard to do efficiently in SQL for ALL items. 
            # Optimization: Pre-fetch products roughly matching the SEARCH QUERY?
            # Yes, let's use the 'q_norm' to fetch likely candidates once.
            
            # (Outside the loop, strictly speaking, would be better, but let's do simple per-item check first)
            # To avoid N+1, we might rely on a memory cache or just do it. SQLite/Postgres is fast enough for 20 items.
            from sqlalchemy import func
            from app.models.product import Product
            
            # Find closest product
            # 1. Product name is in Vinted Title
            # 2. Vinted Title is in Product Name
            # This is crude. Let's try exact first.
            potential_product = db.query(Product).filter(
                func.lower(Product.product_name) == clean_title
            ).first()
            
            if not potential_product:
                # Try partial: Product Name contained in Vinted Title
                # Limit to 1 to avoid full scan, maybe filter by console if we knew it
                # Using the query text to narrow down candidates could help?
                # Let's try to match words.
                pass 

            # Refined Strategy: 
            # If the User's Search Query matches a Product Name exactly, use THAT product for all items?
            # E.g. User searches "Super Mario 64". We find Product "Super Mario 64". 
            # We assume all results are that game (dangerous but common for specific searches).
            # Let's try to find a 'Target Product' based on the Search Query first.
            
            target_product = db.query(Product).filter(
               func.lower(Product.product_name) == q_norm 
            ).first()
            
            if not target_product:
                 # Try 'contains'
                 target_product = db.query(Product).filter(
                     Product.product_name.ilike(f"%{q_norm}%")
                 ).first()

            if target_product:
                # Valid comparison
                # Compare Price (Total) vs Loose Price
                # Vinted Item Price + Protection + Shipping (approx 3+3=6?)
                # We have fee/shipping from client if available, else estimate
                
                # item structure from VintedClient:
                # 'price': {'amount': X, ...}, 'fee': ..., 'shipping': ...
                # But here 'item' is the raw dict from client OR the simple dict ?
                # The 'raw_items' come from vinted_client.search().
                
                price_amt = float(item.get('price', {}).get('amount', 0))
                
                # Try to get fees if present (VintedClient adds them now)
                fee = float(item.get('fee', {}).get('amount', 0))
                ship = float(item.get('shipping', {}).get('amount', 0))
                
                # If 0, assume defaults for estimation: Fee=5%+.7, Ship=2.99
                if fee == 0: fee = (price_amt * 0.05) + 0.7
                if ship == 0: ship = 2.99
                
                total_est = price_amt + fee + ship
                
                # Threshold: 70% of Loose Price (Good Deal)
                market_ref = target_product.loose_price
                if market_ref and market_ref > 0:
                     if total_est < (market_ref * 0.7):
                         is_deal = True

            if not existing:
                new_result = SniperResult(
                    query_id=db_query.id,
                    external_id=ext_id,
                    title=item['title'],
                    price=price_val,
                    currency=item.get('price', {}).get('currency_code', 'EUR'),
                    url=item['url'],
                    image_url=item.get('photo', {}).get('url'),
                    created_at=datetime.utcnow(),
                    # Store structured data if model supports it? No, model is simple.
                    # We lose fee/shipping info in DB currently unless we add cols.
                    # But 'is_potential_deal' is saved.
                    is_potential_deal=is_deal
                )
                db.add(new_result)
                saved_count += 1
            
            # Format for response
            response_items.append({
                "id": ext_id,
                "title": item['title'],
                "price": price_val,
                "currency": "EUR",
                "url": item['url'],
                "image_url": item.get('photo', {}).get('url'),
                "is_cached": False,
                "is_potential_deal": is_deal,
                "platform": item.get('brand', 'Vinted'), # Pass scraped brand as platform
                # Pass back estimated details for UI. Rounding to 2 decimals is crucial.
                "total_estimate": {"amount": round(price_amt + fee + ship, 2), "currency_code": "EUR"}
            })
            
        except Exception as e:
            print(f"Error saving item {item}: {e}")
            continue

    db.commit()
    
    return {
        "success": True, 
        "items": response_items, 
        "debug": {**debug_info, "saved_new_items": saved_count, "source": "zenrows_live"}
    }

@router.post("/watches", response_model=SniperWatchOut)
def create_watch(
    watch_data: SniperWatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q_norm = normalize_query(watch_data.query_text)
    
    # Get or Create Query
    db_query = db.query(SniperQuery).filter(SniperQuery.query_text == q_norm).first()
    if not db_query:
        db_query = SniperQuery(query_text=q_norm, last_scraped_at=None)
        db.add(db_query)
        db.commit()
        db.refresh(db_query)
        
    # Check if already watching
    existing_watch = db.query(SniperWatch).filter(
        SniperWatch.user_id == current_user.id,
        SniperWatch.query_id == db_query.id
    ).first()
    
    if existing_watch:
        if not existing_watch.is_active:
             existing_watch.is_active = True
             db.commit()
             db.refresh(existing_watch)
        return dict(existing_watch, query_text=db_query.query_text)

    new_watch = SniperWatch(
        user_id=current_user.id,
        query_id=db_query.id,
        is_active=True
    )
    db.add(new_watch)
    db.commit()
    db.refresh(new_watch)
    
    # Return as output schema (requires mapping query_text)
    # Pydantic ORM mode handles relations if naming matches, but here our schema has query_text flat.
    # We can fake it or use a property.
    result = SniperWatchOut(
        id=new_watch.id,
        query_text=db_query.query_text,
        is_active=new_watch.is_active,
        created_at=new_watch.created_at
    )
    return result

@router.get("/watches", response_model=List[SniperWatchOut])
def get_my_watches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Join with Query to get text
    watches = db.query(SniperWatch, SniperQuery.query_text)\
        .join(SniperQuery, SniperWatch.query_id == SniperQuery.id)\
        .filter(SniperWatch.user_id == current_user.id)\
        .filter(SniperWatch.is_active == True)\
        .all()
        
    return [
        SniperWatchOut(
            id=w.SniperWatch.id,
            query_text=w.query_text,
            is_active=w.SniperWatch.is_active,
            created_at=w.SniperWatch.created_at
        )
        for w in watches
    ]

@router.delete("/watches/{watch_id}")
def delete_watch(
    watch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    watch = db.query(SniperWatch).filter(
        SniperWatch.id == watch_id,
        SniperWatch.user_id == current_user.id
    ).first()
    
    if not watch:
        raise HTTPException(404, "Watch not found")
        
    # Soft delete or Hard delete? Hard for now.
    db.delete(watch)
    db.commit()
    return {"success": True}
