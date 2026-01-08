import sys
import os

# Add parent directory to path so we can import 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, ".."))

from sqlalchemy import text
from app.db.session import engine

def count_ps5():
    with engine.connect() as conn:
        try:
            # Try lowercase/uppercase variants or standard
            result = conn.execute(text("SELECT count(*) FROM products WHERE console_name = 'Playstation 5'"))
            print(f"PS5_COUNT:{result.scalar()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    count_ps5()
