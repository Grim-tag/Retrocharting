from app.db.session import SessionLocal
from app.models.product import Product
from app.models.game import Game
from sqlalchemy import text
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_slugs():
    db = SessionLocal()
    try:
        logger.info("Starting Game Slug Backfill...")
        
        # 1. Count items needing fix
        missing_count = db.query(Product).filter(
            Product.game_id != None, 
            Product.game_slug == None
        ).count()
        
        logger.info(f"Found {missing_count} products with linked Game but missing game_slug.")
        
        if missing_count == 0:
            logger.info("Nothing to fix.")
            return

        # 2. Perform Update
        # Try Postgres Syntax (Fastest) then Fallback to ORM
        try:
            logger.info("Attempting FAST SQL update...")
            # Postgres: UPDATE target SET col = source.col FROM source WHERE target.join_id = source.id
            stmt = text("UPDATE products SET game_slug = games.slug FROM games WHERE products.game_id = games.id")
            result = db.execute(stmt)
            db.commit()
            logger.info("SQL Update completed.")
        except Exception as e:
            db.rollback()
            logger.warning(f"SQL Update failed (likely SQLite logic difference): {e}")
            logger.info("Fallback to ORM Iteration (Slower but safe)...")
            
            products = db.query(Product).join(Game).filter(
                Product.game_id != None,
                Product.game_slug == None
            ).all()
            
            count = 0
            for p in products:
                p.game_slug = p.game.slug
                count += 1
                if count % 1000 == 0:
                    db.commit()
                    print(f"Processed {count}...")
            
            db.commit()
            logger.info(f"ORM Update completed: {count} items.")

    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_slugs()
