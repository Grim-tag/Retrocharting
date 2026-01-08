import sys
import os
from sqlalchemy import text

# Setup path
from dotenv import load_dotenv
load_dotenv(".env")

backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.append(backend_path)

from app.db.session import SessionLocal

def check_genres():
    db = SessionLocal()
    try:
        # Get all distinct genres
        result = db.execute(text("SELECT DISTINCT genre FROM products WHERE genre IS NOT NULL")).fetchall()
        genres = [row[0] for row in result]
        
        print("--- GENRES IN DB ---")
        for g in sorted(genres):
            print(f"'{g}'")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_genres()
