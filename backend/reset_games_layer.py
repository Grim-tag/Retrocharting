from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product
from sqlalchemy import text
import logging
from app.services.consolidation import run_consolidation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reset_games")

def reset_and_rebuild():
    db = SessionLocal()
    try:
        logger.info("🚧 STARTING GAME LAYER RESET 🚧")
        
        # 1. Unlink Products (Set game_id = NULL)
        logger.info("1. Unlinking Products from Games...")
        db.execute(text("UPDATE products SET game_id = NULL"))
        db.commit()
        
        # 2. Truncate Games Table (Cascade might handle links, but explicit is safer)
        logger.info("2. Truncating Games Table...")
        # TRUNCATE is faster and resets IDs (optional, but cleaner)
        # RESTART IDENTITY resets sequences
        db.execute(text("TRUNCATE TABLE games RESTART IDENTITY CASCADE"))
        db.commit()
        
        logger.info("✅ Games Layer Wiped. Products preserved.")
        
        # 3. Run Fusion
        logger.info("3. Running Fresh Fusion (Consolidation)...")
        stats = run_consolidation(db=db, dry_run=False)
        
        logger.info(f"🎉 REBUILD COMPLETE! Created {stats['games_created']} games.")
        
    except Exception as e:
        logger.error(f"❌ FAILED: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("This will DELETE ALL GAMES and REBUILD them from Products.")
    print("User Collections are SAFE (linked to Products).")
    confirm = input("Type 'RESET' to confirm: ")
    if confirm == "RESET":
        reset_and_rebuild()
    else:
        print("Cancelled.")
