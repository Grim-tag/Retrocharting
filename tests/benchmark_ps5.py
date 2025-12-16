
import requests
import time
import os
from urllib.parse import quote

API_URL = "http://localhost:8000/api/v1/products"
CONSOLE = "PAL Playstation 5"

def test_fetch(limit, label):
    print(f"\n--- Testing {label} (Limit {limit}) ---")
    start = time.time()
    try:
        url = f"{API_URL}/?console={quote(CONSOLE)}&limit={limit}&type=game"
        print(f"GET {url}")
        response = requests.get(url, timeout=30) # 30s timeout
        duration = time.time() - start
        
        print(f"Status: {response.status_code}")
        print(f"Time: {duration:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Items received: {len(data)}")
            if len(data) > 0:
                print(f"Sample: {data[0].get('product_name')}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    print(f"Benchmarking Console: {CONSOLE}")
    # Test 1: Page Load (Server Side)
    test_fetch(40, "Initial Server Render")
    
    # Test 2: Client Hydration
    test_fetch(2000, "Client Hydration")
