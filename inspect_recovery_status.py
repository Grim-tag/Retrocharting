import sys
import os
from datetime import datetime, timedelta
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product
from app.models.scraper_log import ScraperLog
from sqlalchemy import desc, asc

def inspect_status():
    db = SessionLocal()
    try:
        print("--- Scraper Logs (Last 5) ---")
        logs = db.query(ScraperLog).filter(ScraperLog.source.like('%price_recovery%')).order_by(desc(ScraperLog.start_time)).limit(5).all()
        for log in logs:
            print(f"[{log.start_time}] Status: {log.status} | Processed: {log.items_processed} | Error: {log.error_message}")

        print("\n--- Stubborn Items Analysis ---")
        # Items with PC ID, No CIB Price, and Recently Scraped
        stuck_query = db.query(Product).filter(
            Product.pricecharting_id != None,
            (Product.cib_price == None) | (Product.cib_price == 0.0)
        )
        total_stuck = stuck_query.count()
        print(f"Total Items Pending Recovery: {total_stuck}")
        
        if total_stuck > 0:
            # Check timestamps
            oldest = stuck_query.order_by(asc(Product.last_scraped)).first()
            newest = stuck_query.order_by(desc(Product.last_scraped)).first()
            
            print(f"Oldest Scrape: {oldest.last_scraped} (ID: {oldest.id} - {oldest.product_name})")
            print(f"Newest Scrape: {newest.last_scraped} (ID: {newest.id} - {newest.product_name})")
            
            # Check how many are "hot" (< 1 hour)
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            hot_count = stuck_query.filter(Product.last_scraped > one_hour_ago).count()
            print(f"Items Scraped in last 1 hour: {hot_count}")
            
            if hot_count == total_stuck:
                print("\n[DIAGNOSIS] ALL pending items were scraped recently. The job behaves correctly by stopping.")
            else:
                print("\n[DIAGNOSIS] Some items are old enough. The job should continue.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_status()
