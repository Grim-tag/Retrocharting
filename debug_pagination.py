import requests
from bs4 import BeautifulSoup

def debug_paging():
    url = "https://www.pricecharting.com/console/pc-games"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    print(f"Status: {resp.status_code}")
    soup = BeautifulSoup(resp.content, 'html.parser')
    print(f"Title: {soup.title.string if soup.title else 'No Title'}")
    
    # Look for ANY link with cursor-id
    links = soup.find_all('a')
    cursor_found = False
    for l in links:
        href = l.get('href')
        text = l.get_text(strip=True)
        if "Next" in text:
            print(f"Found NEXT link: text='{text}' href='{href}' rel='{l.get('rel')}'")
        
        if href and 'cursor-id' in href:
            print(f"Found cursor link: {text} -> {href}")
            print(f"Rel attribute: {l.get('rel')}")
            cursor_found = True
            
    if not cursor_found:
        print("No cursor-id links found.")

if __name__ == "__main__":
    debug_paging()
