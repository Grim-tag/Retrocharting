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
    import_csv_dump()

@app.post("/api/debug/import")
def debug_import(background_tasks: BackgroundTasks):
    from app.services.import_dump import import_csv_dump
    background_tasks.add_task(import_csv_dump)
    return {"message": "Import started in background"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/v1/products", tags=["products"])

@app.get("/")
def read_root():
    return {"message": "Welcome to RetroCharting API"}
