import requests
import pandas as pd
import io
import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.product import Product
from app.core.config import settings

# Create tables
Base.metadata.create_all(bind=engine)

def download_csv():
    # Download Consoles (Hardware)
    url = f"https://www.pricecharting.com/price-guide/download-custom?t={settings.PRICECHARTING_API_TOKEN}&category=consoles"
    print(f"Downloading consoles data from {url}...")
    response = requests.get(url)
    response.raise_for_status()
    return response.content

def ingest_data():
    csv_content = download_csv()
    df = pd.read_csv(io.BytesIO(csv_content))
    
    # Inspect columns
    print("Columns found in CSV:", df.columns.tolist())
    
    db: Session = SessionLocal()
    
    count = 0
    for _, row in df.iterrows():
        console_name = row.get('console-name')
        # No filter: process all consoles


        def clean_price(price_str):
            if pd.isna(price_str):
                return None
            if isinstance(price_str, (int, float)):
                return float(price_str)
            if isinstance(price_str, str):
                return float(price_str.replace('$', '').replace(',', '').strip())
            return None

        try:
            product_data = {
                "pricecharting_id": row.get('id'),
                "console_name": console_name,
                "product_name": row.get('product-name'),
                "loose_price": clean_price(row.get('loose-price')),
                "cib_price": clean_price(row.get('cib-price')),
                "new_price": clean_price(row.get('new-price')),
                "genre": row.get('genre'),
                # release_date might need parsing
            }
            
            # Upsert logic
            existing = db.query(Product).filter(Product.pricecharting_id == product_data['pricecharting_id']).first()
            if existing:
                for key, value in product_data.items():
                    setattr(existing, key, value)
            else:
                db.add(Product(**product_data))
            
            count += 1
            if count % 1000 == 0:
                db.commit()
                print(f"Processed and committed {count} items...")
                
        except Exception as e:
            print(f"Error processing row {row.get('id', 'Unknown')}: {e}")
            db.rollback() # Rollback the failed transaction for this row (if any)
            
    db.commit()
    print(f"Ingestion complete. Processed {count} items.")

if __name__ == "__main__":
    ingest_data()
