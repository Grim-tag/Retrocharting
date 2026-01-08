import requests
from bs4 import BeautifulSoup
import sys
import os

def debug_scrape():
    url = "https://www.pricecharting.com/game/nes/little-samson"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    print(f"Fetching {url}...")
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for script tags with chart data
        print("Searching for script tags...")
        scripts = soup.find_all('script')
        for i, script in enumerate(scripts):
            if script.string:
                print(f"Script {i}: {script.string[:100]}...")
            elif script.get('src'):
                print(f"Script {i} (src): {script.get('src')}")

if __name__ == "__main__":
    debug_scrape()
