import requests
from bs4 import BeautifulSoup
import json
import sys

url = "https://www.pricecharting.com/game/atari-2600/secret-agent"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

print(f"Fetching {url}...")
response = requests.get(url, headers=headers)
if response.status_code != 200:
    print("Failed to fetch page")
    sys.exit(1)

soup = BeautifulSoup(response.content, 'html.parser')

scripts = soup.find_all('script')
for script in scripts:
    if script.string and "VGPC.chart_data" in script.string:
        print("\nFound Chart Data script!")
        start_index = script.string.find("VGPC.chart_data =") + len("VGPC.chart_data =")
        end_index = script.string.find(";", start_index)
        json_str = script.string[start_index:end_index].strip() if end_index != -1 else script.string[start_index:].strip()
        
        try:
            chart_data = json.loads(json_str)
            print("\nSample Data Points:")
            for condition, points in chart_data.items():
                if points:
                    print(f"\nCondition: {condition}")
                    # Print first few points
                    for p in points[:3]:
                        print(f"  Timestamp: {p[0]}, Value: {p[1]}")
                    
                    # Check recent point
                    last_point = points[-1]
                    print(f"  Latest Point: {last_point}")
        except Exception as e:
            print(f"Error parsing JSON: {e}")
