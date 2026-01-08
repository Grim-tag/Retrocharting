import sys
import os
from sqlalchemy import text

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

from app.db.session import engine

def check_counts():
    consoles_to_check = ["NES", "Super Nintendo", "Playstation 3"]
    
    with engine.connect() as conn:
        for console in consoles_to_check:
            result = conn.execute(text("SELECT count(*) FROM products WHERE console_name = :c"), {"c": console}).scalar()
            print(f"Count for '{console}': {result}")

if __name__ == "__main__":
    check_counts()
