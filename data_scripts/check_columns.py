import requests
import pandas as pd
import io
import sys
import os

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

from dotenv import load_dotenv
# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

from app.core.config import settings

def check_columns():
    token = settings.PRICECHARTING_API_TOKEN
    if not token:
        print("No token found in settings.")
        return

    url = f"https://www.pricecharting.com/price-guide/download-custom?t={token}&category=video-games&limit=5"
    print(f"Downloading data from {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        df = pd.read_csv(io.BytesIO(response.content))
        print("Columns found:", df.columns.tolist())
        print("First row:", df.iloc[0].to_dict())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_columns()
