
from sqlalchemy.orm import Session
from app.services.pc_games_scraper import scrape_pc_games_service
from app.services.enrichment import enrichment_job
from app.models.scraper_log import ScraperLog
from datetime import datetime

def smart_import_pc_games(limit: int = 50000):
    """
    Orchestrator:
    1. Runs the recursive scraper to fetch basics (Title, Price).
    2. Immediately triggers the Enrichment Job to fill gaps (Desc, Genre, Image).
    """
    print(f"Starting Smart Import for PC Games (Limit: {limit})")
    
    # Step 1: SCRAPE
    print("--- STEP 1: SCRAPING PRICECHARTING ---")
    # We create a fresh DB session inside the service, so we just call it.
    # Note: scrape_pc_games_service needs a DB session passed to it?
    # Let's check signature. It takes (db, limit).
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        # We manually log the start of the orchestration
        # Actually scrape_pc_games_service manages its own logging if we use the wrapper?
        # No, the wrapper is just a background task holder.
        # We'll call the service logic directly.
        
        # Scrape
        result = scrape_pc_games_service(db, limit)
        print(f"Scrape Result: {result}")
        
        # Step 2: ENRICH
        print("--- STEP 2: ENRICHING WITH IGDB ---")
        # IGDB job is self-contained (creates its own session)
        # We set a high duration for this follow-up job
        enrichment_job(max_duration=3600*2, limit=limit, console_filter="PC Games")
        
        print("Smart Import Completed successfully.")
        
    except Exception as e:
        print(f"Smart Import Failed: {e}")
    finally:
        db.close()
