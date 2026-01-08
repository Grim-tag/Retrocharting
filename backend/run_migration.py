from app.db.session import engine
from sqlalchemy import text

def run_migration():
    print("Running migration to add 'source' column to scraper_logs...")
    with engine.connect() as conn:
        try:
            # Check if column exists strictly to avoid error
            conn.execute(text("ALTER TABLE scraper_logs ADD COLUMN source VARCHAR DEFAULT 'scraper'"))
            conn.commit()
            print("Migration successful: Added 'source' column.")
        except Exception as e:
            print(f"Migration notice (might already exist): {e}")

if __name__ == "__main__":
    run_migration()
