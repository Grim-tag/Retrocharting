import requests
import time

def check_url(url, category):
    try:
        start = time.time()
        response = requests.head(url) # HEAD is enough for headers
        duration = (time.time() - start) * 1000 # ms
        
        print(f"[{category}] {url}")
        print(f"  Status: {response.status_code}")
        print(f"  Time: {duration:.0f}ms")
        
        # Check for Cache Headers (Common in Static/CDN)
        cache_headers = ['X-Vercel-Cache', 'X-Nextjs-Cache', 'Age', 'CF-Cache-Status', 'X-Cache']
        found_cache = False
        for h in cache_headers:
            if h in response.headers:
                print(f"  {h}: {response.headers[h]}")
                found_cache = True
        
        if not found_cache:
            print("  [INFO] No explicit CDN/Cache headers found (Common on Render without CDN configuration)")
            
        print("-" * 40)
        return response.status_code == 200
    except Exception as e:
        print(f"Error checking {url}: {e}")
        return False

urls = [
    # Games (Unified)
    ("Game", "https://retrocharting.com/fr/games/super-mario-64"),
    ("Game", "https://retrocharting.com/fr/games/final-fantasy-vii-ps1"),
    ("Game", "https://retrocharting.com/fr/games/halo-combat-evolved-xbox"),
    
    # Accessories (Unified)
    ("Accessory", "https://retrocharting.com/fr/accessories/manette-n64-grise"), # Hypothétique
    ("Accessory", "https://retrocharting.com/fr/accessories/dualshock-2-black"), # Hypothétique
    
    # Systems (Should be static too if generated)
    ("System", "https://retrocharting.com/fr/games?console=Nintendo+64"),
]

print("--- Checking SSG Status ---\n")
for cat, url in urls:
    check_url(url, cat)
