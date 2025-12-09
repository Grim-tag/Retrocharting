from app.services.vinted_client import vinted_client
import json

def test_vinted_parsing():
    print("Scraping Vinted for 'Mario Kart 8'...")
    # We call the search method which uses ZenRows
    result = vinted_client.search("Mario Kart 8", limit=3)
    
    print(f"Found {len(result['items'])} items.")
    
    # Save debug HTML if available
    if "debug" in result and "html_preview" in result["debug"]:
        with open("vinted_dump.html", "w", encoding="utf-8") as f:
            f.write(result["debug"]["html_preview"])
            print("Saved vinted_dump.html")

    for item in result['items']:
        print(f"Title: {item['title']}")
        print(f"Brand (Current): {item.get('brand')}")
        print(f"Price: {item.get('price')}")
        print(f"URL: {item.get('url')}")
        print(f"Raw Terms: {item.get('_all_texts')}")
        print("-" * 20)

if __name__ == "__main__":
    test_vinted_parsing()
