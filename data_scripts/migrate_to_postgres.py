
import os
import sys
import logging
from sqlalchemy import create_engine, MetaData, Table, text
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db_migration")

# Paths
current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(os.path.dirname(current_dir), 'collector.db')
backend_path = os.path.join(os.path.dirname(current_dir), 'backend')
sys.path.append(backend_path)

def migrate(postgres_url):
    if not os.path.exists(db_path):
        logger.error(f"Local database not found at {db_path}")
        return

    logger.info(f"Source: sqlite:///{db_path}")
    logger.info("Target: PostgreSQL Remote")

    # Engines
    sqlite_engine = create_engine(f"sqlite:///{db_path}")
    pg_engine = create_engine(postgres_url)

    # Reflect SQLite tables
    metadata = MetaData()
    metadata.reflect(bind=sqlite_engine)
    
    table_names = metadata.tables.keys()
    logger.info(f"Found source tables: {list(table_names)}")

    # Connect
    sqlite_conn = sqlite_engine.connect()
    pg_conn = pg_engine.connect()
    
    # Imports for Schema Creation
    try:
        from app.db.session import Base
        from app.models.user import User
        from app.models.product import Product
        from app.models.price_history import PriceHistory
        from app.models.listing import Listing
        from app.models.sales_transaction import SalesTransaction
        from app.models.comment import Comment
        from app.models.translation import Translation
        from app.models.collection_item import CollectionItem
        from app.models.scraper_log import ScraperLog
        from app.models.sniper import SniperWatch
        
        logger.info("Ensuring schema exists on target...")
        Base.metadata.create_all(pg_engine)
        
    except ImportError as e:
        logger.error(f"Import Error: {e}")
        return

    try:
        # CLEAR/DROP TABLES to ensure Schema Sync
        # We must DROP because TRUNCATE leaves old schema (missing 'ean' column etc.)
        logger.info("Dropping tables to ensure fresh schema (DROP CASCADE)...")
        tables_to_clear = [
            'users', 'products', 'price_history', 'listings', 
            'sales_transactions', 'comments', 'translations', 
            'collection_items', 'scraper_logs', 'sniper_watches',
             # Add any other potential tables
            'alembic_version' 
        ]
        
        # Verify which tables actully exist to avoid error
        existing_tables_pg = MetaData()
        existing_tables_pg.reflect(bind=pg_engine)
        pg_tables = existing_tables_pg.tables.keys()
        
        for t in tables_to_clear:
            if t in pg_tables:
                 logger.info(f"Dropping {t}...")
                 pg_conn.execute(text(f'DROP TABLE "{t}" CASCADE'))
        
        pg_conn.commit()
        logger.info("Target database cleared/dropped.")
        
        logger.info("Re-creating schema from scratch...")
        Base.metadata.create_all(pg_engine)
            
        # Define migration order (Parents first)
        migration_order = [
            'users', 
            'products', 
            'price_history', 
            'listings', 
            'sales_transactions', 
            'comments', 
            'translations',
            'collection_items',
            'scraper_logs',
            'sniper_watches'
        ]
        
        for table_name in migration_order:
            if table_name not in table_names:
                continue
                
            logger.info(f"Migrating table: {table_name}...")
            
            # Use Raw SQL to avoid SQLAlchemy trying to parse DateTimes automatically and failing
            # This returns raw strings from SQLite
            try:
                rows = sqlite_conn.execute(text(f"SELECT * FROM {table_name}")).mappings().all()
            except Exception as e:
                logger.error(f"Error reading {table_name}: {e}")
                continue
            
            if not rows:
                logger.info(f"  No data in {table_name}. Skiping.")
                continue

            logger.info(f"  Found {len(rows)} rows.")
            
            data = []
            for row in rows:
                row_dict = dict(row) # Already a mapping due to .mappings()
                # Sanitize DateTime strings for Postgres (Space -> T)
                for k, v in row_dict.items():
                    if isinstance(v, str):
                        # Detect "YYYY-MM-DD HH:MM:SS" (len 19) or "YYYY-MM-DD HH:MM:SS.mmmmmm"
                        if len(v) >= 19 and v[4] == '-' and v[7] == '-':
                            if ' ' in v and 'T' not in v:
                                row_dict[k] = v.replace(' ', 'T')
                data.append(row_dict)
            
            # Start a transaction for the table
            trans = pg_conn.begin() 
            chunk_size = 1000
            try:
                for i in range(0, len(data), chunk_size):
                    chunk = data[i:i+chunk_size]
                    pg_conn.execute(Table(table_name, MetaData(), autoload_with=pg_engine).insert(), chunk)
                    if i % 5000 == 0:
                        logger.info(f"  Inserted {i + len(chunk)} rows...")
                trans.commit()
            except Exception as e:
                trans.rollback()
                logger.error(f"Failed to insert {table_name}: {e}")
                raise e

        logger.info("Migration Completed Successfully!")

    except Exception as e:
        logger.error(f"Migration Failed: {e}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_to_postgres.py <POSTGRES_URL>")
        url = input("Enter PostgreSQL URL: ").strip()
        if url:
            migrate(url)
    else:
        migrate(sys.argv[1])
