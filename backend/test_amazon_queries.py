from app.services.amazon_client import amazon_client
import json

queries = [
    "Vampire The Masquerade: Bloodlines 2 PAL Playstation 5",
    "Vampire The Masquerade: Bloodlines 2 Playstation 5",
    "Vampire The Masquerade: Bloodlines 2 PS5",
    "Vampire The Masquerade Bloodlines 2"
]

for q in queries:
    print(f"\n--- Searching: '{q}' ---")
    try:
        results = amazon_client.search_items(q, limit=2)
        print(f"Found {len(results)} items.")
        if results:
            print("First item:", results[0]['title'], results[0]['price'])
    except Exception as e:
        print(f"Error: {e}")
