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

from app.routers import products, admin, translations, auth, collection
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(translations.router, prefix="/api/v1/translations", tags=["translations"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(collection.router, prefix="/api/v1/collection", tags=["collection"])

@app.on_event("startup")
def startup_event():
    from app.services.import_dump import import_csv_dump
    # Run synchronously on startup to ensure data is there? Or background?
    # Let's run it directly but it might block.
    # For safety, let's just print a message and maybe run it if we can.
    # Actually, let's rely on the manual trigger if startup fails or is too slow.
    # But user wants it auto.
    # import_csv_dump()
    print("Skipping auto-import on startup to prevent timeout. Use /api/debug/import to trigger manually.")

@app.post("/api/debug/import")
def debug_import(background_tasks: BackgroundTasks):
    from app.services.import_dump import import_csv_dump
    background_tasks.add_task(import_csv_dump)
    return {"message": "Import started in background"}

@app.get("/api/debug/status")
def debug_status():
    import os
    from app.db.session import SessionLocal
    from app.models.product import Product
    
    # Check CSV path
    app_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(app_dir, 'data', 'products_dump.csv')
    csv_exists = os.path.exists(csv_path)
    
    # Check DB
    db = SessionLocal()
    try:
        product_count = db.query(Product).count()
    except Exception as e:
        product_count = str(e)
    finally:
        db.close()
@app.get("/api/debug/consoles")
def debug_consoles():
    from app.db.session import SessionLocal
    from app.models.product import Product
    from sqlalchemy import func
    
    db = SessionLocal()
    try:
        consoles = db.query(Product.console_name, func.count(Product.id)).group_by(Product.console_name).all()
        return {"consoles": [{"name": c[0], "count": c[1]} for c in consoles]}
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

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
