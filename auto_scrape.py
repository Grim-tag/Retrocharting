import requests
import time
import sys

BASE_URL = "https://retrocharting-backend.onrender.com"
SCRAPE_ENDPOINT = f"{BASE_URL}/api/debug/scrape"
LIMIT = 50
DELAY_SECONDS = 60  # Wait 60s between batches (approx 1s per item processing time)

def auto_scrape():
    print(f"Starting auto-scraper targeting {BASE_URL}")
    print(f"Batch size: {LIMIT}")
    print(f"Delay between batches: {DELAY_SECONDS}s")
    print("Press Ctrl+C to stop.")
    
    batch_count = 1
    
    try:
        while True:
            print(f"\n--- Batch #{batch_count} ---")
            try:
                response = requests.post(f"{SCRAPE_ENDPOINT}?limit={LIMIT}")
                if response.status_code == 200:
                    print(f"Success: {response.json()}")
                else:
                    print(f"Error: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"Connection failed: {e}")
            
            print(f"Waiting {DELAY_SECONDS} seconds...")
            time.sleep(DELAY_SECONDS)
            batch_count += 1
            
    except KeyboardInterrupt:
        print("\nAuto-scraper stopped by user.")

if __name__ == "__main__":
    auto_scrape()
