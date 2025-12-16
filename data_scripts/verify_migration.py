
import os
import sys
from sqlalchemy import create_engine, text

# Local DB
db_path = "collector.db"
if not os.path.exists(db_path):
    print(f"Local DB not found at {db_path}")
    sys.exit(1)

local_uri = f"sqlite:///{db_path}"
# Remote DB (Hardcoded from previous context for convenience of verification)
remote_uri = "postgresql://retrocharting_db_user:wkgDPzv2cdhNWuzeu8oCrlxT3TruPAw8@dpg-d4onr2fgi27c738kvsh0-a.frankfurt-postgres.render.com/retrocharting_db"

tables = ["products", "price_history", "collection_items", "users"]

print(f"{'Table':<20} | {'Local (SQLite)':<15} | {'Remote (Postgres)':<15} | {'Status'}")
print("-" * 65)

try:
    local_eng = create_engine(local_uri)
    remote_eng = create_engine(remote_uri)

    with local_eng.connect() as l_conn, remote_eng.connect() as r_conn:
        for t in tables:
            try:
                l_count = l_conn.execute(text(f"SELECT count(*) FROM {t}")).scalar()
            except Exception: l_count = "Err"
            
            try:
                r_count = r_conn.execute(text(f"SELECT count(*) FROM {t}")).scalar()
            except Exception: r_count = "Err"

            status = "✅ OK" if l_count == r_count else f"⚠️ Diff ({l_count - r_count if isinstance(l_count, int) and isinstance(r_count, int) else '?'})"
            print(f"{t:<20} | {l_count:<15} | {r_count:<15} | {status}")

except Exception as e:
    print(f"\nConnection Error: {e}")
