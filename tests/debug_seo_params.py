import requests
import re

URL = 'http://localhost:3000/en/games/pal-playstation-4?sort=loose_desc'

try:
    print(f"Fetching {URL}...")
    r = requests.get(URL, timeout=10)
    
    # 1. Check Debug Div
    m_debug = re.search(r'id="debug-seo"[^>]*>(.*?)</div>', r.text)
    if m_debug:
        print(f"DEBUG DIV CONTENT: [{m_debug.group(1)}]")
    else:
        print("DEBUG DIV NOT FOUND")
        
    # 2. Check Title
    m_title = re.search(r'<title>(.*?)</title>', r.text)
    if m_title:
        print(f"TITLE TAG: [{m_title.group(1)}]")
    else:
        print("TITLE TAG NOT FOUND")

except Exception as e:
    print(f"ERROR: {e}")
