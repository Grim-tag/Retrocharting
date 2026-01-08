from app.db.session import SessionLocal
from app.services.consolidation import run_consolidation
from app.models.game import Game
from app.models.product import Product

def test_consolidation():
    db = SessionLocal()
    print("Running consolidation (DRY RUN)...")
    
    # Clean up any existing games first to test fairly? 
    # Or just run against current DB.
    # Let's run against current DB.
    
    try:
        stats = run_consolidation(db, dry_run=True)
        print("--- Dry Run Stats ---")
        print(stats)
        
        # Checking orphans count
        total = db.query(Product).count()
        orphans = db.query(Product).filter(Product.game_id == None).count()
        print(f"Total Products: {total}")
        print(f"Orphans (Pre-Migration): {orphans}")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_consolidation()
