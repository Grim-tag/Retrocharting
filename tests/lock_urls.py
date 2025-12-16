import requests
import sys
import time

# Configuration
BASE_URL = "http://localhost:3000"

# List of "Sacred" URLs that MUST work
# Tuples of (Description, URL, expected_text_snippet)
SACRED_URLS = [
    ("Home Page", "/", "RetroCharting"), 
    ("Video Games Hub", "/en/games", "Video Games"),
    ("Console Page (PS4)", "/en/games/pal-playstation-4", "Playstation 4"),
    ("Console Page (N64)", "/en/games/nintendo-64", "Nintendo 64"),
    # Add a known product URL here once we confirm one exists, for now relying on catalog
]

def check_url(name, path, expected_text):
    url = f"{BASE_URL}{path}"
    try:
        response = requests.get(url, timeout=5)
        
        # 1. Check Status Code
        if response.status_code != 200:
            print(f"❌ [FAIL] {name}: Status {response.status_code} (Expected 200)")
            print(f"   URL: {url}")
            return False
            
        # 2. Check Content
        if expected_text and expected_text not in response.text:
            print(f"❌ [FAIL] {name}: Content mismatch. Could not find '{expected_text}'")
            print(f"   URL: {url}")
            return False
            
        print(f"✅ [PASS] {name}")
        return True
        
    except requests.exceptions.ConnectionError:
        print(f"❌ [CRITICAL] Could not connect to {BASE_URL}. Is the server running?")
        return False
    except Exception as e:
        print(f"❌ [ERROR] {name}: {e}")
        return False

def main():
    print(f"🔒 Starting Safety Check on {BASE_URL}...")
    print("-" * 40)
    
    all_passed = True
    for name, path, expected in SACRED_URLS:
        if not check_url(name, path, expected):
            all_passed = False
            
    print("-" * 40)
    if all_passed:
        print("🎉 ALL SYSTEMS GO. URLs are safe.")
        sys.exit(0)
    else:
        print("⛔ BROKEN LINKS DETECTED. Do not push!")
        sys.exit(1)

if __name__ == "__main__":
    main()
