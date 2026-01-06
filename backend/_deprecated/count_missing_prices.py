from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.game import Game
from sqlalchemy import or_

def count_remaining():
    db = SessionLocal()
    try:
        # Criteria: Valid PC ID but Missing CIB Price
        base_query = db.query(Product).filter(
            Product.pricecharting_id != None,
            or_(Product.cib_price == None, Product.cib_price == 0.0)
        )
        
        total_missing = base_query.count()
        
        # 1. Recently Scraped (e.g. last 24h) -> "Tried but found nothing" (Unsolvable for now)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        recently_checked = base_query.filter(Product.last_scraped > cutoff).count()
        
        # 2. Backlog (Never Scraped or Old) -> "True Remaining Work"
        backlog_query = base_query.filter(or_(Product.last_scraped == None, Product.last_scraped < cutoff))
        backlog_count = backlog_query.count()
        
        print(f"Total with Missing CIB: {total_missing}")
        print(f" - Recently Checked (Likely No Data): {recently_checked}")
        print(f" - TRUE BACKLOG (To do): {backlog_count}")
        
        # 3. Sample Candidates for Live Check
        print("\n--- SAMPLE CANDIDATES FOR LIVE CHECK ---")
        samples = backlog_query.limit(10).all()
        for p in samples:
            print(f"ID: {p.id} | Name: {p.product_name} | Console: {p.console_name} | PC_ID: {p.pricecharting_id}")
            
    finally:
        db.close()

if __name__ == "__main__":
    count_remaining()
