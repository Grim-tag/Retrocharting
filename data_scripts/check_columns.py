from sqlalchemy import create_engine, inspect
import os

# Ensure we use the absolute path to the DB
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Assuming the DB is in the root collector directory or accessible
# Adjust path to point to parent directory
DB_PATH = os.path.join(os.path.dirname(BASE_DIR), 'collector.db')
print(f"Checking DB at: {DB_PATH}")

DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(DATABASE_URL)

try:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    if 'collection_items' in tables:
        columns = inspector.get_columns('collection_items')
        print("\nColumns in collection_items:")
        for column in columns:
            print(f"- {column['name']} ({column['type']})")
    else:
        print("\nTable 'collection_items' NOT found.")
except Exception as e:
    print(f"Error: {e}")
