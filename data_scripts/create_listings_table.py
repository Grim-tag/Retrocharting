import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

# Force absolute path to the correct DB BEFORE importing app
db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')
os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
print(f"Forcing DATABASE_URL to: {os.environ['DATABASE_URL']}")

from app.db.session import engine, Base
from app.models.listing import Listing
from app.models.product import Product

def create_table():
    print("Creating listings table...")
    Listing.__table__.create(bind=engine)
    print("Table created.")

if __name__ == "__main__":
    create_table()
