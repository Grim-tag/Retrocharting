import requests

urls = [
    "http://localhost:3000/games/pc",
    "http://localhost:3000/fr/jeux-video/pc"
]

print("Testing Console URLs...")
for url in urls:
    try:
        response = requests.head(url)
        if response.status_code == 200:
             print(f"[OK] {url}")
        else:
             print(f"[{response.status_code}] {url}")
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
