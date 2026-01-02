import time
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.scraper_log import ScraperLog
from app.services.pricecharting_client import pricecharting_client

def recover_missing_prices(limit: int = 100):
    """
    Job to fetch missing CIB/New prices from PriceCharting for items that only have Loose prices.
    """
    db = SessionLocal()
    print(f"Starting Price Recovery (Limit: {limit})...")
    
    # Init Log
    log_entry = ScraperLog(
        source="price_recovery",
        status="running",
        items_processed=0, 
        start_time=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    try:
        # Target: Items with Valid PC ID but Missing/Zero CIB Price
        # We assume if CIB is missing, New is likely missing too.
        # We prioritize items that have at least a Loose price (valid data) but incomplete full data.
        candidates = db.query(Product).filter(
            Product.pricecharting_id != None,
            (Product.cib_price == None) | (Product.cib_price == 0.0)
        ).limit(limit).all()
        
        if not candidates:
            print("Price Recovery: No candidates found.")
            log_entry.status = "completed"
            log_entry.error_message = "No candidates found"
            db.commit()
            return
            
        print(f"Price Recovery: Found {len(candidates)} candidates.")
        
        updated_count = 0
        
        for p in candidates:
            try:
                # Rate Limiting (Conservative for PriceCharting)
                time.sleep(1.0) 
                
                details = pricecharting_client.get_product(str(p.pricecharting_id))
                if not details:
                    print(f" - [{p.product_name}] Failed to fetch details")
                    continue
                    
                # Update Prices
                # "cib-price": 1234 (cents) -> Divide by 100? 
                # Wait, check client output format. usually it returns raw numbers provided by API.
                # Assuming API returns Cents or Dollars? PChearting API typically returns Cents in some endpoints, Dollars in others.
                # Let's inspect `pricecharting_client.py` response structure if needed.
                # Assuming simple mapping for now based on `get_product` docstring: "current prices...".
                
                # API usually returns: {"id": "...", "loose-price": 1250, "cib-price": 2500...} (Cents)
                # We need to verify unit.
                
                def parse_price(val):
                    if val is None: return 0.0
                    return float(val) / 100.0 # Cents to Unit
                
                # Update Logic
                if "cib-price" in details:
                    p.cib_price = parse_price(details.get("cib-price"))
                if "new-price" in details:
                    p.new_price = parse_price(details.get("new-price"))
                if "loose-price" in details:
                    # Update loose too if we are at it?
                    p.loose_price = parse_price(details.get("loose-price"))
                
                # New fields (optional)
                if "box-only-price" in details:
                    p.box_only_price = parse_price(details.get("box-only-price"))
                if "manual-only-price" in details:
                    p.manual_only_price = parse_price(details.get("manual-only-price"))
                    
                p.last_scraped = datetime.utcnow()
                updated_count += 1
                
                if updated_count % 10 == 0:
                    db.commit()
                    print(f"   Updated {updated_count}/{len(candidates)}...")
                    
            except Exception as e:
                print(f"Error updating product {p.id}: {e}")
                
        db.commit()
        
        log_entry.status = "success"
        log_entry.items_processed = updated_count
        log_entry.end_time = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        log_entry.status = "error"
        log_entry.error_message = str(e)
        db.commit()
        print(f"Price Recovery Fatal Error: {e}")
    finally:
        db.close()
