
from sqlalchemy import create_engine, text
import os

db_path = "collector.db"
engine = create_engine(f"sqlite:///{db_path}")

with engine.connect() as conn:
    rows = conn.execute(text("SELECT DISTINCT console_name FROM products ORDER BY console_name")).fetchall()
    print(f"Total Systems: {len(rows)}")
    with open("systems_list.txt", "w", encoding="utf-8") as f:
        for r in rows:
            f.write(f"{r[0]}\n")
            print(r[0])
