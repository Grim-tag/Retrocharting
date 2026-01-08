import os
import sys
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
load_dotenv(env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found")
    sys.exit(1)

engine = create_engine(db_url)
product_id = 3830

with engine.connect() as conn:
    result = conn.execute(text("SELECT * FROM products WHERE id = :id"), {"id": product_id})
    product = result.mappings().fetchone()
    
    if product:
        print(f"Product ID: {product['id']}")
        print(f"Loose Price: {product['loose_price']}")
        print(f"Last Scraped: {product['last_scraped']}")
        
        # Check for price_history column or similar
        if 'price_history' in product:
            ph = product['price_history']
            print(f"Price History Type: {type(ph)}")
            print(f"Price History: {ph}")
        else:
            print("No 'price_history' column found.")
