import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

try:
    print("Importing scrape_missing_data...")
    from app.services.scraper import scrape_missing_data
    print("Import Success!")
except Exception as e:
    print(f"Import Failed: {e}")
