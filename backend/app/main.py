from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles # Trigger Reload
from fastapi.middleware.cors import CORSMiddleware
import os
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
# Base.metadata.create_all(bind=engine) # Moved to startup_event

app = FastAPI(title="RetroCharting API")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://retrocharting-frontend.onrender.com",
    "https://retrocharting.onrender.com",
    "https://retrocharting.com",
    "https://www.retrocharting.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend/
static_dir = os.path.join(base_dir, "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

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
from app.routers import users
print("Loading Public Profile Router...") # Force Rebuild 1
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
from app.routers import comments
app.include_router(comments.router, prefix="/api/v1/comments", tags=["comments"])
from app.routers import import_collection
app.include_router(import_collection.router, prefix="/api/v1/import", tags=["import"])

@app.get("/api/v1/health-debug")
def health_debug():
    """
    Diagnostic endpoint to check DB connection in Production
    """
    status = {
        "database_url_type": "Unknown",
        "product_count": 0,
        "error": None,
        "env_vars": {
            "HAS_DB_URL": bool(os.getenv("DATABASE_URL")),
            "DB_URL_PREFIX": os.getenv("DATABASE_URL", "")[:15] if os.getenv("DATABASE_URL") else "None"
        }
    }
    
    try:
        # Check Config
        from app.core.config import settings
        status["database_url_type"] = "SQLite" if "sqlite" in settings.SQLALCHEMY_DATABASE_URI else "Postgres/Other"
        status["configured_uri"] = settings.SQLALCHEMY_DATABASE_URI.split("@")[-1] # Safe mask
        
        # Check DB
        from app.db.session import SessionLocal
        from app.models.product import Product
        from sqlalchemy import text
        
        db = SessionLocal()
        try:
            # Try Raw Count
            count = db.query(Product).count()
            status["product_count"] = count
            
            # Try Fetch One
            first = db.query(Product).first()
            if first:
                status["sample_product"] = first.product_name
                status["sample_id"] = first.id
            
        except Exception as e:
            status["error"] = f"DB Query Error: {str(e)}"
        finally:
            db.close()
            
    except Exception as e:
        status["error"] = f"System Error: {str(e)}"
        
    return status

import threading
from sqlalchemy import text

def _run_migration_background():
    """
    Attempts to run schema migration (adding columns) in a background thread
    to avoid blocking Uvicorn startup / port binding.
    """
    try:
        from app.db.session import engine, Base
        from app.db.migrations import run_auto_migrations
        from app.core.config import settings
        
        print("Migration: Starting background schema check...")

        # Optimize SQLite Concurrency (Crucial for avoiding 'Locked' errors)
        if "sqlite" in str(settings.SQLALCHEMY_DATABASE_URI):
            try:
                with engine.connect() as conn:
                    conn.execute(text("PRAGMA journal_mode=WAL;"))
                    conn.execute(text("PRAGMA synchronous=NORMAL;"))
                print("Migration: SQLite WAL mode enabled.")
            except Exception as e:
                print(f"Migration: Failed to set WAL mode: {e}")
        
        # 1. Create Tables (Safe fallback)
        try:
            Base.metadata.create_all(bind=engine)
            print("Migration: Tables created/verified.")
        except Exception as e:
            print(f"Migration: Table creation failed (DB might be down): {e}")
            return 
            
        # 2. Add Missing Columns (Robust)
        # Using the logic from migrations.py instead of manual queries
        try:
            run_auto_migrations(engine)
            print("Migration: Auto-migrations completed.")
        except Exception as e:
            print(f"Migration: Auto-migration failed: {e}")

    except Exception as e:
        print(f"Migration Error (Background): {e}")

@app.on_event("startup")
async def startup_event():
    print("Startup: Initializing Application...")
    
    # 1. Async Initialization (Tables + Migrations)
    # We move ALL DB interaction to background to prevent "Port scan timeout" if DB is slow/recovering.
    try:
        threading.Thread(target=_run_migration_background, daemon=True).start()
    except Exception as e:
        print(f"Startup Thread Error: {e}")

    # 2. Initialize Scheduler (Crucial)
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.scraper import scrape_missing_data, backfill_history
        from app.services.enrichment import enrichment_job, refresh_prices_job
        from app.services.pc_games_scraper import scrape_pc_games_bg_wrapper

        scheduler = BackgroundScheduler()
        # SCRAPER: 2 workers max (defined in scraper.py), run every 1 min
        scheduler.add_job(scrape_missing_data, 'interval', minutes=1, args=[110, 200], id='auto_scrape', replace_existing=True)
        # PRICE REFRESH: Every 10 mins (Fast API)
        scheduler.add_job(refresh_prices_job, 'interval', minutes=10, args=[300], id='price_refresh', replace_existing=True)
        # HISTORY BACKFILL: Every 5 mins (Slow HTML)
        scheduler.add_job(backfill_history, 'interval', minutes=5, args=[10], id='history_backfill', replace_existing=True)
        # ENRICHMENT: Every 2 mins
        scheduler.add_job(enrichment_job, 'interval', minutes=2, args=[110, 50], id='auto_enrich', replace_existing=True)
        # PC GAMES: Every 12 hours
        scheduler.add_job(scrape_pc_games_bg_wrapper, 'interval', hours=12, args=[200], id='pc_games_scrape', replace_existing=True)
        
        scheduler.start()
        print("APScheduler started.")
    except Exception as e:
        print(f"Failed to start scheduler: {e}")

    # 3. Quick Schema Check (Minimal)
    # Removed synchronous call to prevent startup timeout/lock. 
    # Handled by background thread now.
    pass

    # 4. Start Amazon Workers (Free Tier Hack: Run inside Main Process)
    try:
        from app.workers.amazon_worker import AmazonWorker
        
        def start_worker(region, console_filter=None):
            worker = AmazonWorker(region, console_filter)
            worker.run()

        # Start 3 threads for PAL, NTSC, JP targeting Playstation 5 initially
        threading.Thread(target=start_worker, args=("PAL", "Playstation 5"), daemon=True).start()
        threading.Thread(target=start_worker, args=("NTSC", "Playstation 5"), daemon=True).start()
        threading.Thread(target=start_worker, args=("JP", "Playstation 5"), daemon=True).start()
        
        print("Startup: Amazon Workers (PAL/NTSC/JP) started in background threads.")
    except Exception as e:
        print(f"Startup: Failed to start Amazon Workers: {e}")


    print("Startup complete.")
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
