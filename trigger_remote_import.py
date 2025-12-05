import requests
import time

BASE_URL = "https://retrocharting-backend.onrender.com"

def run():
    # 1. Reset
    print("1. Resetting Database...")
    try:
        resp = requests.post(f"{BASE_URL}/api/debug/reset-db")
        print(f"Reset: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return
    
    if resp.status_code != 200:
        print("Reset failed.")
        return

    # 2. Check Status
    print("Waiting for reset...")
    time.sleep(2)
    resp = requests.get(f"{BASE_URL}/api/debug/status")
    status = resp.json()
    print(f"Status: {status}")
    
    if status.get("product_count", 1) > 0:
        print("Database not empty? Aborting.")
        return

    # 3. Trigger Import
    print("3. Triggering Import...")
    resp = requests.post(f"{BASE_URL}/api/debug/import")
    print(f"Import Trigger: {resp.status_code} {resp.text}")
    print("Import started in background. Check status in a few minutes.")

if __name__ == "__main__":
    run()
