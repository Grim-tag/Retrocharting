
import sys
import os
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load Env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.db.session import SessionLocal

def benchmark_query(name, func):
    try:
        start = time.time()
        result = func()
        end = time.time()
        duration = end - start
        print(f"[{name}] Time: {duration:.4f}s")
        return result
    except Exception as e:
        print(f"[{name}] FAILED: {e}")
        return []

def run_benchmarks():
    db = SessionLocal()
    try:
        print(f"--- STARTING BENCHMARKS (DB: {db.bind.name}) ---")
        
        # 0. Check Consoles
        print("Checking available consoles...")
        consoles = db.execute(text("SELECT DISTINCT console_name FROM products LIMIT 10")).fetchall()
        print(f"   Consoles found: {[c[0] for c in consoles]}")

        target_console = "PAL PlayStation 4"
        # Validate target
        exists = db.execute(text(f"SELECT 1 FROM products WHERE console_name = '{target_console}'")).scalar()
        if not exists:
             print(f"   WARNING: '{target_console}' not found. Using first available.")
             if consoles: target_console = consoles[0][0]

        print(f"   TARGET: {target_console}")

        # 1. Benchmark Genres Fetch (suspected bottleneck)
        def test_genres():
            stmt = text(f"SELECT DISTINCT genre FROM products WHERE console_name = '{target_console}' AND genre IS NOT NULL AND genre != '' ORDER BY genre")
            return db.execute(stmt).fetchall()
            
        genres = benchmark_query(f"Get Genres ({target_console})", test_genres)
        print(f"   -> Found {len(genres)} genres")

        # 2. Benchmark Products Fetch (Limit 50)
        def test_products_50():
            stmt = text(f"SELECT id, product_name, loose_price FROM products WHERE console_name = '{target_console}' LIMIT 50")
            return db.execute(stmt).fetchall()
            
        p50 = benchmark_query("Get Products (Limit 50)", test_products_50)
        print(f"   -> Fetched {len(p50)} products")

        # 3. Benchmark Products Fetch (Limit 1000)
        def test_products_1000():
            # Select ALL columns to simulate heavy payload
            stmt = text(f"SELECT id, product_name, loose_price, cib_price, new_price, genre, console_name, image_url, description FROM products WHERE console_name = '{target_console}' LIMIT 1000")
            return db.execute(stmt).fetchall()
            
        p1000 = benchmark_query("Get Products (Limit 1000)", test_products_1000)
        print(f"   -> Fetched {len(p1000)} products")

        # 4. Benchmark Search (Simulate 'Zelda')
        def test_search():
             # Use LIKE because SQLite. ILIKE is Postgres only.
             if db.bind.name == 'sqlite':
                 stmt = text("SELECT id, product_name FROM products WHERE product_name LIKE '%Zelda%' LIMIT 50")
             else:
                 stmt = text("SELECT id, product_name FROM products WHERE product_name ILIKE '%Zelda%' LIMIT 50")
             return db.execute(stmt).fetchall()
             
        search = benchmark_query("Search 'Zelda'", test_search)
        print(f"   -> Found {len(search)} results")

        # 5. Benchmark Count
        def test_count():
            stmt = text(f"SELECT count(*) FROM products WHERE console_name = '{target_console}'")
            return db.execute(stmt).scalar()
            
        count = benchmark_query("Count Products", test_count)
        print(f"   -> Total Count: {count}")

        print("--- BENCHMARKS COMPLETE ---")

    finally:
        db.close()

if __name__ == "__main__":
    run_benchmarks()
