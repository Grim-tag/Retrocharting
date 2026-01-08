import sys
import os
from sqlalchemy import text

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

from app.db.session import engine

def list_consoles():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT DISTINCT console_name FROM products ORDER BY console_name")).fetchall()
        consoles = [row[0] for row in result]
        print("Unique Consoles in DB:")
        for c in consoles:
            print(f"- '{c}'")

if __name__ == "__main__":
    list_consoles()
