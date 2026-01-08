from sqlalchemy import create_engine, text
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
try:
    from app.core.config import settings
    db_url = settings.DATABASE_URL
except ImportError:
    # Fallback if local setup differs
    db_url = os.getenv("DATABASE_URL")

def fix_sequences():
    if not db_url:
        print("❌ Error: DATABASE_URL not found.")
        return

    print(f"🔧 Connecting to database to fix sequences...")
    engine = create_engine(db_url)

    # Tables to check. Usually 'products' and 'price_history' are the main ones with IDs
    tables = ['products', 'price_history', 'listings', 'sales_transactions', 'users', 'collections', 'wishlists']

    with engine.connect() as conn:
        for table in tables:
            try:
                # Check if table exists
                result = conn.execute(text(f"SELECT to_regclass('public.{table}')")).scalar()
                if not result:
                    continue

                print(f"   Derived sequence fix for: {table}")
                # Postgres specific command to reset sequence to MAX(id)
                # The generic way is getting the sequence name, but usually it's table_id_seq
                
                # Dynamic SQL query to find sequence name and reset it
                sql = f"""
                SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1) )
                FROM {table};
                """
                conn.execute(text(sql))
                print(f"   ✅ Sequence reset for {table}")
                
            except Exception as e:
                # Some tables might not have serial IDs or might fail if empty
                print(f"   ⚠️ Could not reset {table} (might not be serial or empty): {e}")

    print("\n🎉 Sequences fixed! Duplicate Key errors should be gone.")

if __name__ == "__main__":
    fix_sequences()
