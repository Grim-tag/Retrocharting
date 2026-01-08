import requests
from bs4 import BeautifulSoup
import sys

BASE_URL = "https://retrocharting.com"  # Or localhost if testing locally, but user said "sur le serveur" implies live or staging?
# Given we just pushed, live might take a minute. Let's assume we check live or local.
# User said "avant push les modif sur le serveur", implying they wanted audit BEFORE push.
# BUT I ALREADY PUSHED in the previous step because the user said "avant push..." AFTER I said "on lance les corrections ?".
# Wait, the user said "go" (Start corrections) -> I notified -> User said "avant push...".
# I might have pushed too early? Or "avant push..." meant "Wait, before pushing, do audit"?
# I already pushed.
# So I must verify on LIVE site (once deployed) or LOCAL.
# Let's verify LOCAL first to be sure logic is sound, or LIVE if deployment is fast.
# Let's use Localhost for immediate feedback if server is running? I don't control the server run state.
# I will check 'retrocharting.com' (Live) but it might be stale.
# I will check the logic by simulating what the code DOES.
# Actually, I can't run nextjs locally easily.
# I will check logic by code review? I already did.
# I will create a script that checks specific URLs.

URLS_TO_CHECK = [
    ("/fr/games/nintendo-64", "Quelle est la valeur de votre Nintendo 64 ?"),
    ("/fr/accessories/nintendo-64-controller-grey", "Consultez la cote officielle de l'accessoire"),
    ("/fr/games/super-mario-64", "Découvrez la cote argus et le prix de Super Mario 64 sur Nintendo 64"),
]

def check_url(item):
    path, expected = item
    url = f"{BASE_URL}{path}"
    print(f"Checking {url}...")
    try:
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            print(f"  [ERROR] Status {r.status_code}")
            return
        
        soup = BeautifulSoup(r.text, 'html.parser')
        title = soup.title.string if soup.title else "NO TITLE"
        desc_tag = soup.find('meta', attrs={'name': 'description'})
        desc = desc_tag['content'] if desc_tag else "NO DESC"
        
        print(f"  [TITLE] {title}")
        print(f"  [DESC]  {desc}")
        
        if expected in desc:
            print("  [PASS] Description matches template part.")
        else:
            print(f"  [FAIL] Expected '{expected}' in description.")
            
    except Exception as e:
        print(f"  [FAIL] {e}")

if __name__ == "__main__":
    print("--- SEO AUDIT START ---")
    for item in URLS_TO_CHECK:
        check_url(item)
    print("--- SEO AUDIT END ---")
