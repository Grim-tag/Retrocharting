import requests
import time

URL = "https://retrocharting-backend.onrender.com/api/v1/products/count"

def monitor():
    print("Monitoring Production Stats...")
    initial_count = 0
    
    for i in range(6):
        try:
            resp = requests.get(URL, timeout=10)
            if resp.status_code == 200:
                total = resp.json() # returns int directly
                print(f"[{time.strftime('%H:%M:%S')}] Total Products: {total}")
                
                if i == 0:
                    initial_count = total
                elif total > initial_count:
                    print(f"SUCCESS: Count increased by {total - initial_count}!")
                    return
            else:
                print(f"Error: {resp.status_code}")
        except Exception as e:
            print(f"Connection Error: {e}")
            
        time.sleep(10)

if __name__ == "__main__":
    monitor()
