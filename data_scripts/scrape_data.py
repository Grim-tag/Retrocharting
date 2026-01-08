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
if not os.environ.get("DATABASE_URL"):
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'collector.db')
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    print(f"Forcing DATABASE_URL to: {os.environ['DATABASE_URL']}")

from app.services.scraper import scrape_missing_data

if __name__ == "__main__":
    # Run for 12 minutes max
    MAX_DURATION = 12 * 60
    scrape_missing_data(max_duration=MAX_DURATION, limit=50)
