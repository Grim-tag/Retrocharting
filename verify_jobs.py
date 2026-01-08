
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.scraper import backfill_history
from app.services.pc_games_scraper import scrape_pc_games_bg_wrapper

print("Testing History Backfill (Limit 1)...")
try:
    backfill_history(limit=1)
    print("✅ Backfill History OK")
except Exception as e:
    print(f"❌ Backfill History Failed: {e}")

print("\nTesting PC Games Scraper (Limit 1)...")
try:
    scrape_pc_games_bg_wrapper(limit=1)
    print("✅ PC Games Scraper OK")
except Exception as e:
    print(f"❌ PC Games Scraper Failed: {e}")
