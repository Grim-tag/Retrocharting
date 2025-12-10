
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))


import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

def inspect_logs():
    # Load .env directly
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
    load_dotenv(env_path)
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in env")
        return

    # Create engine directly
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("--- Last 5 Scraper Logs ---")
        # Use raw SQL to avoid importing Model
        result = session.execute(text("SELECT id, start_time, end_time, items_processed, status, error_message FROM scraper_logs ORDER BY id DESC LIMIT 5"))
        for row in result:
             print(f"ID: {row[0]}")
             print(f"  Start: {row[1]}")
             print(f"  End:   {row[2]}")
             print(f"  Items: {row[3]}")
             print(f"  Status:{row[4]}")
             print(f"  Error: {row[5]}")
             print("-" * 30)
             
    except Exception as e:
        print(f"Error reading DB: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    inspect_logs()
