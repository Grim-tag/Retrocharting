
import requests
import sys

# ID from user log
PRODUCT_ID = 8128
API_URL = "http://localhost:8000/api/v1/products" # Assuming default local backend

def test_product(id):
    url = f"{API_URL}/{id}"
    print(f"Fetching {url}...")
    try:
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Error: {response.text}")
        else:
            print("Success!")
            data = response.json()
            print(f"Product: {data.get('product_name')}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_product(PRODUCT_ID)
