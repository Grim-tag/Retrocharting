import requests
import xml.etree.ElementTree as ET

INDEX_URL = "https://retrocharting.com/sitemap.xml"
COUNT_URL = "https://retrocharting-backend.onrender.com/api/v1/games/count"

def inspect_sitemap():
    print(f"Fetching {INDEX_URL}...")
    try:
        resp = requests.get(INDEX_URL)
        if resp.status_code != 200:
            print(f"Error: Status {resp.status_code}")
            return

        if "<!DOCTYPE html>" in resp.text[:100]:
            print("Error: Received HTML instead of XML.")
            return

        root = ET.fromstring(resp.content)
        # Namespace usually: {http://www.sitemaps.org/schemas/sitemap/0.9}
        # Find all 'sitemap' children or 'url' children
        # If it's an index, it has 'sitemap' tags.
        sitemaps = [child for child in root if "sitemap" in child.tag.lower()]
        urls = [child for child in root if "url" in child.tag.lower() and "loc" in child.tag.lower()] # actually child.tag would be {ns}url
        
        print(f"Found {len(sitemaps)} sitemap entries (sub-sitemaps).")
        print(f"Found {len(urls)} url entries (pages).")
        
        # Check first sitemap loc
        for sm in sitemaps[:3]:
             for child in sm:
                 if "loc" in child.tag:
                     print(f" - {child.text}")
                     
    except Exception as e:
        print(f"Exception parsing XML: {e}")

def check_count():
    print(f"Fetching Count from {COUNT_URL}...")
    try:
        resp = requests.get(COUNT_URL)
        print(f"Count Response: {resp.text}")
    except Exception as e:
        print(f"Count Error: {e}")

inspect_sitemap()
check_count()
