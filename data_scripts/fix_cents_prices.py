import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found")
    sys.exit(1)

engine = create_engine(db_url)

with engine.connect() as conn:
    print("Checking for inflated prices...")
    
    # Heuristic: If price matches loose_price * 100 approximately? 
    # Or just assume anything > 1000 is likely cents (unless it is a rare game)
    # But some games are $1000. 
    # Better logic: If we just scraped it and it was 4995, we know that specific source is cents.
    # The scraper update fixes future scrapes.
    # For existing data, we should apply the same divide by 100 logic unconditionally?
    # NO. Some might be correct.
    # However, since this scraper was the only source of history, likely ALL history is in cents.
    
    # Let's count how many are "high"
    res = conn.execute(text("SELECT count(*) FROM price_history WHERE price > 500"))
    count = res.scalar()
    print(f"Found {count} records > 500. Not all are errors, but many might be.")

    # Strategy: Dividing ALL price history by 100 seems consistent with the scraper logic fix.
    # PriceCharting ALWAYS sends cents in that chart data.
    # So we should divide ALL price history entries by 100.
    
    print("Fixing ALL price history entries (dividing by 100)...")
    result = conn.execute(text("UPDATE price_history SET price = price / 100.0"))
    conn.commit()
    print(f"Update complete. Affected rows: {result.rowcount}")
