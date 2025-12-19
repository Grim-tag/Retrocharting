import requests

def test_api():
    url = "http://localhost:8000/api/v1/products/"
    params = {"console": "PC Games", "limit": 10}
    try:
        res = requests.get(url, params=params)
        if res.status_code == 200:
            data = res.json()
            print(f"Found {len(data)} products for 'PC Games'")
            for p in data:
                print(f"- {p['product_name']} (ID: {p['id']})")
        else:
            print(f"Error: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_api()
