
import requests
import sys

# Try potential backend URLs. 
# Usually 'retrocharting-backend.onrender.com' or just 'retrocharting.onrender.com' if user uses a web service.
# Based on CORS in main.py, it seems the backend might be on 'retrocharting.onrender.com' or 'retrocharting-backend.onrender.com'.
# Let's try to construct it from common patterns or just use the domain if it's the same.
# If frontend is retrocharting.com, backend might be api.retrocharting.com or same domain /api/... if using a rewrite?
# BUT frontend uses 'NEXT_PUBLIC_API_URL'.

# Let's assume the user knows the URL or we try to guess.
# Defaulting to checking the one we can guess from context or asking user to check.
# Actually, I can check the local .env to see NEXT_PUBLIC_API_URL if possible?
# I verify .env access first.

def check_endpoint(username):
    # Retrieve API URL from env if possible, or hardcode common guess
    # I'll rely on the user running this locally where .env might exist or just print instructions.
    
    # We will try a few likely candidates
    urls = [
        "https://retrocharting-backend.onrender.com",
        "https://retrocharting.onrender.com",
        "https://retrocharting.com/api" # If proxied
    ]
    
    print(f"Testing public profile API for user: {username}")
    
    for base in urls:
        url = f"{base}/api/v1/users/{username}"
        try:
            print(f"GET {url} ...")
            resp = requests.get(url, timeout=5)
            print(f"  Status: {resp.status_code}")
            if resp.status_code == 200:
                print("  ✅ Success! Payload:", resp.json())
                return
            elif resp.status_code == 404:
                print("  ❌ 404 Not Found (Endpoint missing or User missing)")
            else:
                print(f"  ⚠️ Error: {resp.text}")
        except Exception as e:
            print(f"  ⚠️ Connection failed: {e}")

if __name__ == "__main__":
    username = sys.argv[1] if len(sys.argv) > 1 else "Grimtag"
    check_endpoint(username)
