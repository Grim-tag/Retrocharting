import requests

urls = [
    "http://localhost:3000/games/alan-wake-ii-deluxe-edition-ps5-prices-value",
    "http://localhost:3000/games/bioforge-pc-prices-value",
    "http://localhost:3000/fr/jeux-video/bioforge-pc-prix-cotes"
]

print("Testing URLs...")
for url in urls:
    try:
        response = requests.head(url)
        print(f"[{response.status_code}] {url}")
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
