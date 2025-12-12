from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
# Import ALL models so Base.metadata.create_all sees them
from app.models.sales_transaction import SalesTransaction
from app.models.user import User
from app.models.translation import Translation
from app.models.product import Product
from app.models.listing import Listing
from app.models.price_history import PriceHistory
from app.models.sniper import SniperQuery, SniperWatch, SniperResult
from app.models.collection_item import CollectionItem
from app.models.comment import Comment

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RetroCharting API")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://retrocharting-frontend.onrender.com",
    "https://retrocharting.onrender.com" # In case domain varies
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import traceback

logging.basicConfig(level=logging.ERROR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global error: {exc}")
    logging.error(traceback.format_exc())
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

from fastapi.exceptions import HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": str(exc.detail)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

from app.routers import products, admin, translations, auth, collection, sniper, portfolio
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(translations.router, prefix="/api/v1/translations", tags=["translations"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(collection.router, prefix="/api/v1/collection", tags=["collection"])
app.include_router(sniper.router, prefix="/api/v1/sniper", tags=["sniper"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["portfolio"])
from app.routers import comments
app.include_router(comments.router, prefix="/api/v1/comments", tags=["comments"])
from app.routers import import_collection
app.include_router(import_collection.router, prefix="/api/v1/import", tags=["import"])

@app.on_event("startup")
def startup_event():
    # Initialize Scheduler for automated scraping
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.scraper import scrape_missing_data
        from app.services.enrichment import enrichment_job

        scheduler = BackgroundScheduler()
        # SAFE SCRAPING: Run every 5 minutes, 10 items per batch (to avoid OOM/Zombie)
        scheduler.add_job(scrape_missing_data, 'interval', minutes=5, args=[300, 10], id='auto_scrape', replace_existing=True)
        
        # IGDB ENRICHMENT: Run every 15 minutes, 500 items per batch (Turbo Mode)
        # 500 items * ~0.4s = ~200s (3.3 mins) processing time. plenty of buffer in 15 mins.
        scheduler.add_job(enrichment_job, 'interval', minutes=15, args=[600, 500], id='auto_enrich', replace_existing=True)
        
        scheduler.start()
        print("APScheduler started: Scraping & IGDB jobs registered.")
    except Exception as e:
        print(f"Failed to start scheduler: {e}")

    # Auto-migration logs
    print("Startup complete. Tables ready.")
    
    # --- AUTO-MIGRATION: Check for new columns and add them if missing ---
    try:
        from app.db.session import engine
        from sqlalchemy import inspect, text
        
        print("Checking DB Schema...")
        inspector = inspect(engine)
        
        # 1. Product 'players' column
        product_cols = [c['name'] for c in inspector.get_columns('products')]
        if 'players' not in product_cols:
            print("Migrating: Adding 'players' column to products table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE products ADD COLUMN players TEXT"))
                conn.commit()
        else:
            print("Schema check: 'players' column exists.")

        # 2. Listing 'is_good_deal' column
        listing_cols = [c['name'] for c in inspector.get_columns('listings')]
        if 'is_good_deal' not in listing_cols:
            print("Migrating: Adding 'is_good_deal' column to listings table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE listings ADD COLUMN is_good_deal BOOLEAN DEFAULT false"))
                conn.commit()
        else:
            print("Schema check: 'is_good_deal' column exists.")

        # 3. CollectionItem 'paid_price' column
        collection_cols = [c['name'] for c in inspector.get_columns('collection_items')]
        if 'paid_price' not in collection_cols:
            print("Migrating: Adding 'paid_price' column to collection_items table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE collection_items ADD COLUMN paid_price FLOAT"))
                conn.commit()
        else:
            print("Schema check: 'paid_price' column exists.")

        if 'notes' not in collection_cols:
             print("Migrating: Adding 'notes' column to collection_items table...")
             with engine.connect() as conn:
                 conn.execute(text("ALTER TABLE collection_items ADD COLUMN notes TEXT"))
                 conn.commit()

        if 'user_images' not in collection_cols:
             print("Migrating: Adding 'user_images' column to collection_items table...")
             with engine.connect() as conn:
                 conn.execute(text("ALTER TABLE collection_items ADD COLUMN user_images TEXT"))
                 conn.commit()

        if 'purchase_date' not in collection_cols:
             print("Migrating: Adding 'purchase_date' column to collection_items table...")
             with engine.connect() as conn:
                 # Standardize on TIMESTAMP/DATETIME
                 conn.execute(text("ALTER TABLE collection_items ADD COLUMN purchase_date TIMESTAMP"))
                 conn.commit()

        # Check users table columns
        inspector = inspect(engine)
        user_cols = [col['name'] for col in inspector.get_columns('users')]
        
        if 'ip_address' not in user_cols:
            print("Migrating: Adding 'ip_address' column to users table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN ip_address VARCHAR"))
                conn.commit()

        print("Auto-migration checks complete.")

        # 4. User 'user_rank', 'xp', 'last_active' columns
        user_cols = [c['name'] for c in inspector.get_columns('users')]
        
        if 'user_rank' not in user_cols:
             print("Migrating: Adding 'user_rank' column to users table...")
             with engine.connect() as conn:
                 conn.execute(text("ALTER TABLE users ADD COLUMN user_rank VARCHAR DEFAULT 'Loose'"))
                 conn.commit()

        if 'xp' not in user_cols:
            print("Migrating: Adding 'xp' column to users table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0"))
                conn.commit()
        
        if 'last_active' not in user_cols:
             print("Migrating: Adding 'last_active' column to users table...")
             with engine.connect() as conn:
                conn.commit()
        
        if 'scraper_logs' in inspector.get_table_names():
            log_cols = [c['name'] for c in inspector.get_columns('scraper_logs')]
            if 'source' not in log_cols:
                print("Migrating: Adding 'source' column to scraper_logs table...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE scraper_logs ADD COLUMN source VARCHAR DEFAULT 'scraper'"))
                    conn.commit()

        # 6. Comment 'status' column migration
        if 'comments' in inspector.get_table_names():
            comment_cols = [c['name'] for c in inspector.get_columns('comments')]
            if 'status' not in comment_cols:
                print("Migrating: Adding 'status' column to comments table...")
                with engine.connect() as conn:
                    # Add column
                    conn.execute(text("ALTER TABLE comments ADD COLUMN status VARCHAR DEFAULT 'pending'"))
                    
                    # Backfill from is_approved if exists
                    if 'is_approved' in comment_cols:
                        conn.execute(text("UPDATE comments SET status = 'approved' WHERE is_approved = true"))
                        conn.execute(text("UPDATE comments SET status = 'pending' WHERE is_approved = false"))
                    
                    conn.commit()
    except Exception as e:
        print(f"Auto-migration failed: {e}")
        import traceback
        traceback.print_exc()
    # ---------------------------------------------------------------------

@app.get("/debug-csv")
def debug_csv():
    import os
    import csv
    # backend/app/main.py -> dirname -> backend/app
    app_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(app_dir, 'data', 'products_dump.csv')
    
    if not os.path.exists(csv_path):
        return {"error": f"File not found at {csv_path}"}
        
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = []
            for i, row in enumerate(reader):
                if i >= 5: break
                rows.append(row)
            return {"fieldnames": reader.fieldnames, "rows": rows}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/debug/reset-db")
def debug_reset_db():
    from app.db.session import SessionLocal
    from app.models.product import Product
    from app.models.price_history import PriceHistory
    from app.models.listing import Listing
    from sqlalchemy import text
    
    db = SessionLocal()
    try:
        # Delete children first
        db.query(PriceHistory).delete()
        db.query(Listing).delete()
        
        # Delete all products
        num_deleted = db.query(Product).delete()
        db.commit()
        
        # Reset ID sequence if possible
        try:
            db.execute(text("ALTER SEQUENCE products_id_seq RESTART WITH 1"))
            db.execute(text("ALTER SEQUENCE price_history_id_seq RESTART WITH 1"))
            db.execute(text("ALTER SEQUENCE listings_id_seq RESTART WITH 1"))
        except:
            pass
        return {"status": "success", "deleted_count": num_deleted}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

@app.post("/api/debug/scrape")
def debug_scrape(background_tasks: BackgroundTasks, limit: int = 50):
    from app.services.scraper import scrape_products
    return {"message": f"Scraping started in background (limit={limit})"}

@app.post("/api/debug/init-db")
def debug_init_db():
    from app.db.session import engine, Base
    # Import ALL models
    from app.models.sales_transaction import SalesTransaction
    from app.models.user import User
    from app.models.translation import Translation
    from app.models.product import Product
    from app.models.listing import Listing
    from app.models.price_history import PriceHistory
    from app.models.collection_item import CollectionItem
    from app.models.sniper import SniperQuery, SniperWatch, SniperResult

    try:
        # Check if tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Check again
        new_inspector = inspect(engine)
        new_tables = new_inspector.get_table_names()
        
        return {
            "status": "success", 
            "tables_before": existing_tables, 
            "tables_after": new_tables,
            "message": "Database initialized successfully"
        }
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }
