import sys
import os

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from sqlalchemy import text

def verify_connection():
    db = SessionLocal()
    try:
        # Check DB path logic/content
        print("Attempting to query PriceHistory via Backend Session...")
        result = db.execute(text("SELECT count(*) FROM price_history"))
        count = result.scalar()
        print(f"PriceHistory Rows: {count}")
        
        if count > 0:
            print("SUCCESS: Backend is connected to the populated Root DB.")
        else:
            print("FAILURE: Backend still sees an empty DB.")
            
    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_connection()
