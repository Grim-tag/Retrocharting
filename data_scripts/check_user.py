
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Get database URL from env
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL not set.")
    sys.exit(1)

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_user(username):
    db = SessionLocal()
    try:
        query = text("SELECT id, username, email, is_collection_public FROM users WHERE username ILIKE :username")
        result = db.execute(query, {"username": username}).fetchone()
        
        if result:
            print(f"✅ User found: {result.username} (ID: {result.id})")
            print(f"   Email: {result.email}")
            print(f"   Public Collection: {result.is_collection_public}")
        else:
            print(f"❌ User '{username}' NOT FOUND in database.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = "Grimtag"
    
    check_user(username)
