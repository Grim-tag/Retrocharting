import time
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.scraper_log import ScraperLog
from app.services.pricecharting_client import pricecharting_client

def recover_missing_prices(limit: int = 500, continuous: bool = False):
    """
    Job to fetch missing CIB/New prices from PriceCharting for items that only have Loose prices.
    continuous=True: Runs in a loop with pauses to avoid bans/timeouts.
    """
    db = SessionLocal()
    print(f"Starting Price Recovery (Limit per batch: {limit}, Continuous: {continuous})...")
    
    # Init Log
    log_entry = ScraperLog(
        source=f"price_recovery_{'auto' if continuous else 'manual'}",
        status="running",
        items_processed=0, 
        start_time=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    total_processed = 0
    
    try:
        while True:
            # Target: Items with Valid PC ID but Missing/Zero CIB Price
            candidates = db.query(Product).filter(
                Product.pricecharting_id != None,
                (Product.cib_price == None) | (Product.cib_price == 0.0)
            ).limit(limit).all()
            
            if not candidates:
                print("Price Recovery: No more candidates found.")
                break
                
            print(f"Price Recovery: Processing batch of {len(candidates)} items...")
            
            updated_count = 0
            
            for p in candidates:
                try:
                    # Rate Limiting (Conservative for PriceCharting)
                    time.sleep(1.0) 
                    
                    details = pricecharting_client.get_product(str(p.pricecharting_id))
                    if not details:
                        print(f" - [{p.product_name}] Failed to fetch details")
                        continue
                        
                    def parse_price(val):
                        if val is None: return 0.0
                        return float(val) / 100.0 # Cents to Unit
                    
                    # Update Logic
                    if "cib-price" in details:
                        p.cib_price = parse_price(details.get("cib-price"))
                    if "new-price" in details:
                        p.new_price = parse_price(details.get("new-price"))
                    if "loose-price" in details:
                        p.loose_price = parse_price(details.get("loose-price"))
                    
                    # New fields
                    if "box-only-price" in details:
                        p.box_only_price = parse_price(details.get("box-only-price"))
                    if "manual-only-price" in details:
                        p.manual_only_price = parse_price(details.get("manual-only-price"))
                        
                    p.last_scraped = datetime.utcnow()
                    updated_count += 1
                    total_processed += 1
                    
                    # Commit frequently to save progress
                    if updated_count % 10 == 0:
                        db.commit()
                        
                except Exception as e:
                    print(f"Error updating product {p.id}: {e}")
                    
            db.commit()
            
            # Update Log
            log_entry.items_processed = total_processed
            log_entry.error_message = f"In Progress: {total_processed} items..."
            db.commit()

            if not continuous:
                break
            
            if len(candidates) < limit:
                # We finished the last chunk
                break

            # Pause between batches
            print("Batch finished. Sleeping 60s for safety...")
            time.sleep(60)
            
            # Refresh DB session to avoid staleness issues in long loops
            db.close()
            db = SessionLocal()
        
        log_entry.status = "success"
        log_entry.items_processed = total_processed
        log_entry.end_time = datetime.utcnow()
        log_entry.error_message = "Completed."
        db.commit()
        
    except Exception as e:
        log_entry.status = "error"
        log_entry.error_message = str(e)
        db.commit()
        print(f"Price Recovery Fatal Error: {e}")
    finally:
        db.close()
