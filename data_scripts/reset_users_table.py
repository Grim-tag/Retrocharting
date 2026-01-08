from app.db.session import engine, Base
from app.models.user import User
from app.models.collection_item import CollectionItem
from sqlalchemy import text

def reset_users():
    print("Dropping CollectionItems and Users tables...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS collection_items"))
        conn.execute(text("DROP TABLE IF EXISTS users"))
        conn.commit()
    print("Tables dropped. Restart the backend to recreate them with new schema.")

if __name__ == "__main__":
    reset_users()
