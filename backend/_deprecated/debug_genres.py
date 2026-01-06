from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

with engine.connect() as conn:
    result = conn.execute(text("SELECT DISTINCT genre FROM products"))
    print("Distinct Genres found:")
    for row in result:
        print(f" - '{row[0]}'")
