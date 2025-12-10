
import sys
import os

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from dotenv import load_dotenv
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

from app.services.scraper import scrape_missing_data

if __name__ == "__main__":
    print("Running scraper locally...")
    # Run for short duration (30s) and small limit (5) to test
    count = scrape_missing_data(max_duration=30, limit=5)
    print(f"Scrape completed. Processed: {count}")
