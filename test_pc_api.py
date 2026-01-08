
import requests
import os

# Manual token since environment might not be reloaded yet in this shell context
TOKEN = "f29901d0c208967344c4f0f0bbd9f1315bff361e"
PRODUCT_ID = "433" # Super Mario 64 N64

url = "https://www.pricecharting.com/api/product"

# Search first
search_url = "https://www.pricecharting.com/api/products"
search_params = {"t": TOKEN, "q": "Super Mario 64 Nintendo 64"}
s_resp = requests.get(search_url, params=search_params)
results = s_resp.json()
print("Search Results Structure:", results)

if "products" in results:
    if not results["products"]:
        print("No products in results.")
        exit()
    first = results["products"][0]
elif isinstance(results, list):
    if not results:
         print("Empty list.")
         exit()
    first = results[0]
else:
    print("Unknown format.")
    exit()

print(f"Found: {first['product-name']} (ID: {first['id']})")
PRODUCT_ID = first['id']

# Then Get Details
params = {
    "t": TOKEN,
    "id": PRODUCT_ID
}

try:
    print(f"Querying PriceCharting API for Product ID: {PRODUCT_ID}...")
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    
    print("\n--- API Response Keys ---")
    keys = list(data.keys())
    keys.sort()
    for k in keys:
        print(f"{k}: {data[k]}")

        
    print("\n--- Price Check ---")
    print(f"Loose: {data.get('loose-price')}")
    print(f"CIB: {data.get('cib-price')}")
    print(f"New: {data.get('new-price')}")
    print(f"Box Only: {data.get('box-only-price')}") # Guessing key
    print(f"Manual Only: {data.get('manual-only-price')}") # Guessing key
    
except Exception as e:
    print(f"Error: {e}")
