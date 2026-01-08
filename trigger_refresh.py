import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
PRODUCT_IDS = [66716, 66717]

def trigger_refresh():
    for pid in PRODUCT_IDS:
        url = f"{BASE_URL}/products/{pid}/listings?force=true"
        print(f"Triggering refresh for Product {pid}...")
        try:
            # Note: This requires the local server to be running.
            # If deploying to Render, we can't easily trigger it from here unless we use the production URL.
            # But the user is likely testing on Production?
            # User provided "retrocharting.com" links.
            # So I should curl the PRODUCTION URL if I want to update the live site.
            # But I don't have the admin token handy here easily without login flow.
            # Actually, the endpoint might be protected.
            # Let's try local first if the user runs it locally?
            # User context says "retrocharting.com".
            pass
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    # Just print the curl command for the user or myself to run if needed
    # actually I will run the deployment and tell the user to refresh.
    # The user can just click "Refresh" in the admin if available?
    # Or I can try to hit the local if user is running local.
    # Given the OOM error earlier, user IS deploying to Render.
    print("Deployment required. Auto-refresh logic runs on backend.")
