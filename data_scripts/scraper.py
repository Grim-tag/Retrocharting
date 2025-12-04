import requests
from bs4 import BeautifulSoup

def main():
    url = "https://www.pricecharting.com/"
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        title = soup.title.string if soup.title else "No title found"
        print(f"Page Title: {title}")
    except Exception as e:
        print(f"Error fetching {url}: {e}")

if __name__ == "__main__":
    main()
