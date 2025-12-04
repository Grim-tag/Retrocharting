from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.routers import products

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RetroCharting API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api/v1/products", tags=["products"])

@app.get("/")
def read_root():
    return {"message": "Welcome to RetroCharting API"}
