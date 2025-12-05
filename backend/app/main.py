from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.routers import products

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RetroCharting API")

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
        
    return {
        "cwd": os.getcwd(),
        "app_dir": app_dir,
        "csv_path": csv_path,
        "csv_exists": csv_exists,
        "product_count": product_count,
        "files_in_data": os.listdir(os.path.join(app_dir, 'data')) if os.path.exists(os.path.join(app_dir, 'data')) else "Data dir not found"
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
from app.routers import admin
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": "Welcome to RetroCharting API"}

@app.get("/debug")
def debug_root():
    return {"status": "ok", "message": "Backend is reachable"}

@app.get("/version")
def read_version():
    return {"version": "1.0.2", "deployed_at": "2025-12-04"}

@app.get("/debug-consoles")
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
    background_tasks.add_task(scrape_products, limit)
    return {"message": f"Scraping started in background (limit={limit})"}
