import requests
from bs4 import BeautifulSoup

urls = [
    "http://localhost:3000/games/agent-hugo-pc-prices-value",
    "http://localhost:3000/fr/jeux-video/agent-hugo-pc-prix-cotes"
]

print("Verifying SEO Metadata...")
for url in urls:
    try:
        response = requests.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.title.string if soup.title else "No Title"
            desc = soup.find('meta', attrs={'name': 'description'})
            desc_content = desc['content'] if desc else "No Description"
            
            print(f"\nURL: {url}")
            print(f"Title: {title}")
            print(f"Description: {desc_content}")
        else:
             print(f"[{response.status_code}] {url}")
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
