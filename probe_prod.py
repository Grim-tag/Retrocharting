import requests
import sys

BASE_URL = "https://retrocharting-backend.onrender.com"
HEALTH_URL = f"{BASE_URL}/api/v1/health-debug"
GAME_URL = f"{BASE_URL}/api/v1/games/daffy-duck-in-hollywood-pal-sega-master-system-cote-prix-68267"
COUNT_URL = f"{BASE_URL}/api/v1/games/count"

def check(url, name):
    print(f"Checking {name} ({url})...")
    try:
        resp = requests.get(url, timeout=10)
        print(f"Status: {resp.status_code}")
        try:
            print(f"Body: {resp.json()}")
        except:
            print(f"Body (Text): {resp.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

check(HEALTH_URL, "Health Debug")
check(COUNT_URL, "Game Count")
check(GAME_URL, "Specific Game")
