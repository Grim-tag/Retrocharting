import requests
from bs4 import BeautifulSoup
import random

def get_headers(domain="amazon.fr"):
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    return {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": f"https://www.{domain}/",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1"
    }

def debug_search(query, domain="amazon.fr"):
    url = f"https://www.{domain}/s"
    params = {"k": query}
    headers = get_headers(domain)
    
    print(f"\n--- Debugging: {query} on {domain} ---")
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Status Code: {resp.status_code}")
        
        if resp.status_code != 200:
            print("❌ Failed request")
            return

        soup = BeautifulSoup(resp.content, "html.parser")
        
        # Check Title (Catch Captcha)
        page_title = soup.title.string.strip() if soup.title else "No Title"
        print(f"Page Title: {page_title}")
        
        if "CAPTCHA" in page_title or "Robot Check" in page_title:
            print("⚠️ CAPTCHA DETECTED!")
            return

        # Check Selectors
        results = soup.select("div.s-result-item[data-component-type='s-search-result']")
        print(f"Found {len(results)} search results via selector.")
        
        if len(results) == 0:
            print("Dumping first 500 chars of content:")
            print(resp.text[:500])
            # Check raw text for product name to see if it's there but selector failed
            if "7 Days" in resp.text:
                print("✅ Text '7 Days' found in HTML, but selector failed.")
            else:
                print("❌ Text '7 Days' NOT found in HTML. Empty result?")

        for i, item in enumerate(results[:3]):
            h2_el = item.select_one("h2")
            print(f"--- Result {i+1} HTML ---")
            print(h2_el) # Print raw H2
            
        for i, item in enumerate(results[:3]):
            # Title with Fallbacks
            title_el = item.select_one("h2 a span") or item.select_one("h2 span") or item.select_one("h2")
            title = title_el.get_text(strip=True) if title_el else "No Title"
            
            price_whole = item.select_one(".a-price-whole")
            price = price_whole.get_text(strip=True) if price_whole else "No Price"
            
            print(f"Parsed Result {i+1}: {title} - {price}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_search("7 Days To Die Playstation 5", "amazon.fr")
    # debug_search("3D Mini Golf Remastered Playstation 5", "amazon.fr")
