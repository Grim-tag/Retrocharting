import requests
from bs4 import BeautifulSoup
import time

def test_scraper():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    url = "https://www.pricecharting.com/console/pc-games?cursor-id=&sort=start-date&genre-name="
    
    print(f"Scraping {url}...")
    
    session = requests.Session()
    session.headers.update(headers)
    
    # 1. Initial GET
    resp = session.get(url)
    print(f"Page 1 Status: {resp.status_code}")
    
    soup = BeautifulSoup(resp.content, 'html.parser')
    rows = soup.select('table#games_table tbody tr')
    print(f"Page 1 Rows: {len(rows)}")
    if rows:
        print(f"First Page Sample: {rows[0].select_one('td.title a').get_text(strip=True)}")

    # 2. Find Next
    form = soup.select_one('form.next_page')
    if not form:
        print("ERROR: No form.next_page found on Page 1.")
        return

    cursor_input = form.select_one('input[name="cursor"]')
    if not cursor_input:
        print("ERROR: No cursor input found on Page 1.")
        return
        
    cursor_val = cursor_input.get('value')
    print(f"Found cursor: {cursor_val}")
    
    # 3. POST next
    print(f"Posting for Page 2 with cursor={cursor_val}...")
    time.sleep(1)
    resp2 = session.post(url, data={"cursor": cursor_val})
    print(f"Page 2 Status: {resp2.status_code}")
    
    soup2 = BeautifulSoup(resp2.content, 'html.parser')
    rows2 = soup2.select('table#games_table tbody tr')
    print(f"Page 2 Rows: {len(rows2)}")
    if rows2:
        print(f"Second Page Sample: {rows2[0].select_one('td.title a').get_text(strip=True)}")
        
    # Check if loop continues
    form2 = soup2.select_one('form.next_page')
    if form2:
        cursor2 = form2.select_one('input[name="cursor"]').get('value')
        print(f"Found next cursor: {cursor2}. Logic seems valid.")
    else:
        print("No next form on Page 2 (End of list or error?)")

if __name__ == "__main__":
    test_scraper()
