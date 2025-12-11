from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.user import User
from app.models.collection_item import CollectionItem
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/summary")
def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get high-level portfolio stats: Total Value, Item Count, Console Count.
    """
    # Fetch all items with their product details
    # Efficiency: We could do this in SQL, but for <5000 items Python is fine and easier for conditional pricing
    items = db.query(CollectionItem, Product).join(Product, CollectionItem.product_id == Product.id)\
        .filter(CollectionItem.user_id == current_user.id).all()
        
    total_value = 0.0
    total_invested = 0.0
    item_count = len(items)
    consoles = set()
    
    top_items = []
    
    for item, product in items:
        # Calculate Value
        val = 0.0
        if item.condition == 'LOOSE': val = product.loose_price or 0
        elif item.condition == 'CIB': val = product.cib_price or 0
        elif item.condition == 'NEW': val = product.new_price or 0
        elif item.condition == 'GRADED': val = product.new_price or 0 # Fallback
        
        total_value += val
        total_invested += (item.paid_price or 0)
        consoles.add(product.console_name)
        
        # Add to top items candidate list
        top_items.append({
            "name": product.product_name,
            "console": product.console_name,
            "value": val,
            "paid": item.paid_price,
            "image": product.image_url
        })
        
    # Sort top items by value
    top_items.sort(key=lambda x: x["value"], reverse=True)
    
    return {
        "total_value": round(total_value, 2),
        "total_invested": round(total_invested, 2),
        "total_profit": round(total_value - total_invested, 2),
        "item_count": item_count,
        "console_count": len(consoles),
        "top_items": top_items[:5]
    }

@router.get("/history")
def get_portfolio_history(
    range_days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculates the portfolio value over time.
    Complex logic: Replays the collection state day by day.
    """
    try:
        # 1. Get all items with Product
        items = db.query(CollectionItem, Product).join(Product, CollectionItem.product_id == Product.id)\
            .filter(CollectionItem.user_id == current_user.id).all()
        if not items:
            return []

        item_product_map = {item.id: item.product_id for item, prod in items}
        product_ids = [item.product_id for item, prod in items]
        
        # DYNAMIC RANGE CALCULATION
        if range_days == -1:
            # Find earliest date (purchase_date or added_at)
            min_date = datetime.utcnow().date()
            for item, _ in items:
                d = None
                if item.purchase_date:
                    if isinstance(item.purchase_date, datetime): d = item.purchase_date.date()
                    else: d = item.purchase_date
                
                # If we want to fallback to added_at? No, user explicitly wants "date d'obtention".
                # If no purchase_date is set, what do we do? Assume today?
                # Let's say if purchase_date is None, ignore it for range calculation or assume recent.
                
                if d and d < min_date:
                    min_date = d
            
            # Calculate days from min_date to today
            days_diff = (datetime.utcnow().date() - min_date).days
            # Cap at 3650 days (10 years) to avoid performance kill
            range_days = min(days_diff, 3650)
            if range_days < 7: range_days = 30 # Minimum 1 week context
            
        # 2. Get Price History for all these products
        # We need a robust way to find "price at date X"
        # Let's fetch all history points for these products
        history_records = db.query(PriceHistory).filter(
            PriceHistory.product_id.in_(product_ids),
            PriceHistory.date >= datetime.utcnow().date() - timedelta(days=range_days + 5) # Buffer
        ).all()
        
        # Organize history: ProductID -> Condition -> Date -> Price
        # Map: p_id -> { "loose": { date_obj: price }, "cib": ... }
        price_map = {} 
        
        for h in history_records:
            if h.product_id not in price_map: price_map[h.product_id] = {}
            cond_u = h.condition.upper()
            if cond_u == "USED": cond_u = "LOOSE" # Normalize
            if cond_u == "COMPLETE": cond_u = "CIB"
            
            if cond_u not in price_map[h.product_id]: price_map[h.product_id][cond_u] = {}
            
            # HANDLE DB DATE vs DATETIME
            h_date = h.date
            if isinstance(h_date, datetime):
                h_date = h_date.date()
            
            price_map[h.product_id][cond_u][h_date] = h.price

        # 3. Iterate days
        chart_data = []
        today = datetime.utcnow().date()
        
        for i in range(range_days, -1, -1):
            current_date = today - timedelta(days=i)
            daily_total_value = 0.0
            daily_total_invested = 0.0
            
            for item, product in items:
                # CHECK PURCHASE DATE
                # If item has a purchase_date, count it only if purchase_date <= current_date
                # If no purchase_date, fall back to added_at? No, user wants current state if date missing.
                # But let's respect purchase_date if set.
                if item.purchase_date:
                    p_date = item.purchase_date
                    if isinstance(p_date, datetime): p_date = p_date.date()
                    if p_date > current_date:
                        continue # Not owned yet

                # Invested Value Logic
                if item.paid_price:
                    daily_total_invested += item.paid_price

                # Market Value Logic
                p_id = item.product_id
                cond = item.condition
                
                # Graded fallback
                if cond == 'GRADED': cond = 'NEW'
                
                price = 0.0
                if p_id in price_map and cond in price_map[p_id]:
                    date_prices = price_map[p_id][cond]
                    # Look for exact match or nearest past match
                    # Simple loop back
                    for lookback in range(0, 7):
                        d_check = current_date - timedelta(days=lookback)
                        if d_check in date_prices:
                            price = date_prices[d_check]
                            break
                
                # Fallback to current price if history missing (which is common for new items)
                if price == 0.0:
                     if cond == 'LOOSE': price = product.loose_price or 0
                     elif cond == 'CIB': price = product.cib_price or 0
                     elif cond == 'NEW': price = product.new_price or 0
                     elif cond == 'GRADED': price = product.new_price or 0
                
                daily_total_value += price
                
            chart_data.append({
                "date": current_date.isoformat(),
                "value": round(daily_total_value, 2),
                "invested": round(daily_total_invested, 2)
            })
            
        return chart_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in portfolio history: {e}")
        # Return empty list or maybe error dict? Frontend expects list.
        # Returning a single error point to make it visible in chart? No, that's ugly.
        return []
        
@router.get("/movers")
def get_portfolio_movers(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Indentify top gainers and losers in the collection over the last X days.
    """
    items = db.query(CollectionItem, Product).join(Product, CollectionItem.product_id == Product.id)\
        .filter(CollectionItem.user_id == current_user.id).all()
        
    movers = []
    
    # Pre-fetch history for "days" ago
    # We want price closest to (Today - days)
    target_date = datetime.utcnow().date() - timedelta(days=days)
    
    # Efficient fetch: Get price history for these products around target date
    # Ideally exactly on target_date, but realistically the latest BEFORE or ON target date.
    # Simple approach: fetch all history for these items and find best match in python
    product_ids = [item.product_id for item, _ in items]
    
    # Fetch history window: [target_date - 7, target_date + 1] to catch nearest
    window_start = target_date - timedelta(days=7)
    window_end = target_date + timedelta(days=1)
    
    history_records = db.query(PriceHistory).filter(
        PriceHistory.product_id.in_(product_ids),
        PriceHistory.date >= window_start,
        PriceHistory.date <= window_end
    ).all()
    
    # Map: pid -> cond -> date -> price
    price_map = {}
    for h in history_records:
        if h.product_id not in price_map: price_map[h.product_id] = {}
        cond = h.condition.upper()
        if cond == 'USED': cond = 'LOOSE'
        if cond == 'COMPLETE': cond = 'CIB'
        if cond not in price_map[h.product_id]: price_map[h.product_id][cond] = {}
        price_map[h.product_id][cond][h.date] = h.price

    for item, product in items:
        # 1. Current Price
        current_val = 0.0
        if item.condition == 'LOOSE': current_val = product.loose_price or 0
        elif item.condition == 'CIB': current_val = product.cib_price or 0
        elif item.condition == 'NEW': current_val = product.new_price or 0
        elif item.condition == 'GRADED': current_val = product.new_price or 0
        
        if current_val == 0: continue
            
        # 2. Past Price
        past_val = current_val # Default to flat if no history
        
        # Look for price at target_date
        pid = product.id
        cond = item.condition
        if cond == 'GRADED': cond = 'NEW'
        
        if pid in price_map and cond in price_map[pid]:
            # scan back from target_date
            found = False
            for lookback in range(0, 8):
                d = target_date - timedelta(days=lookback)
                if d in price_map[pid][cond]:
                    past_val = price_map[pid][cond][d]
                    found = True
                    break
        
        # 3. Diff
        pct_change = 0.0
        if past_val > 0:
            pct_change = ((current_val - past_val) / past_val) * 100.0
        
        if abs(pct_change) > 0.1: # Only track real movers
            movers.append({
                "name": product.product_name,
                "console": product.console_name,
                "current_price": current_val,
                "past_price": past_val,
                "pct_change": round(pct_change, 2),
                "abs_change": round(current_val - past_val, 2),
                "image": product.image_url
            })
            
    # Sort: Top 5 Gainers and Bottom 5 Losers
    movers.sort(key=lambda x: x['pct_change'], reverse=True)
    
    return {
        "gainers": movers[:5],
        "losers": movers[-5:] if len(movers) > 5 and movers[-1]['pct_change'] < 0 else []
    }

@router.get("/debug")
def debug_portfolio_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Debug endpoint to check why portfolio might be empty.
    """
    # 1. Raw Items
    raw_count = db.query(CollectionItem).filter(CollectionItem.user_id == current_user.id).count()
    
    # 2. Joined Items
    joined_query = db.query(CollectionItem, Product).join(Product, CollectionItem.product_id == Product.id)\
        .filter(CollectionItem.user_id == current_user.id)
    joined_count = joined_query.count()
    
    joined_sample = []
    for item, prod in joined_query.limit(5).all():
        joined_sample.append({
            "item_id": item.id,
            "product_id": item.product_id,
            "product_name": prod.product_name,
            "loose_price": prod.loose_price
        })

    # 3. Check Price History existence
    history_count = db.query(PriceHistory).count()
    
    return {
        "user_id": current_user.id,
        "raw_item_count": raw_count,
        "joined_item_count": joined_count,
        "history_total_rows": history_count,
        "joined_sample": joined_sample
    }
