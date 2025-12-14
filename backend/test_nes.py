from app.services.amazon_client import amazon_client

names = [
    "Nintendo NES Action Set Nintendo NES", # Current Logic
    "Nintendo NES Action Set", # Product Name only
    "Nintendo NES Console", # Broad
]

for n in names:
    print(f"--- Searching: '{n}' ---")
    try:
        results = amazon_client.search_items(n, limit=2)
        print(f"Found {len(results)} items.")
        for r in results:
             print(f" Title: {r['title']}")
    except Exception as e:
        print(e)
