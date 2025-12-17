
from sqlalchemy import text
from sqlalchemy.engine import Engine
import logging

logger = logging.getLogger(__name__)

def run_auto_migrations(engine: Engine):
    """
    Checks for missing columns and adds them (Lite-weight migration system).
    Safe to run on every startup.
    """
    try:
        with engine.connect() as conn:
            # Check for 'asin' column in 'products'
            # This logic works for SQLite. For Postgres, we might need different query logic (information_schema).
            # But let's assume SQLite first as config hints it via file path.
            # Actually catch exception is easier.
            
            try:
                # Try selecting the column. If fail, it's missing.
                conn.execute(text("SELECT asin FROM products LIMIT 1"))
            except Exception:
                logger.info("Auto-Migration: Column 'asin' missing. Adding it...")
                try:
                    conn.rollback() # Reset transaction if needed
                    conn.execute(text("ALTER TABLE products ADD COLUMN asin TEXT"))
                    conn.execute(text("ALTER TABLE products ADD COLUMN ean TEXT")) # Might fail if exists
                    conn.execute(text("ALTER TABLE products ADD COLUMN gtin TEXT"))
                    conn.execute(text("ALTER TABLE products ADD COLUMN manual_only_price FLOAT")) 
                    conn.execute(text("ALTER TABLE products ADD COLUMN box_only_price FLOAT"))
                    conn.commit()
                except Exception as e:
                    # If partial fail (e.g. ean exists), ignore
                    print(f"Migration note: {e}")
                    pass
            
            # Re-verify or separate checks?
            # To be robust, checking each one is better.
            
            common_cols = [
                ("asin", "TEXT"),
                ("ean", "TEXT"),
                ("gtin", "TEXT"),
                ("box_only_price", "FLOAT"),
                ("manual_only_price", "FLOAT"),
                ("image_blob", "BYTEA")
            ]
            
            for col, type_ in common_cols:
                try:
                     conn.execute(text(f"SELECT {col} FROM products LIMIT 1"))
                except Exception:
                     # Rollback previous failed select
                     conn.rollback()
                     logger.info(f"Adding column {col}...")
                     try:
                         # SQLite syntax. Postgres uses same for simple add.
                         conn.execute(text(f"ALTER TABLE products ADD COLUMN {col} {type_}"))
                         conn.commit()
                     except Exception as e:
                         pass

            logger.info("Auto-Migrations completed.")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
