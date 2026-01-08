from backend.app.services.listing_classifier import ListingClassifier

test_cases = [
    ("Playstation 5", "30 Sport Games in 1"),
    ("PAL Playstation 5", "30 Sport Games in 1"),
    ("Playstation 5", "007 First Light"),
    ("Super Nintendo", "Some Game"),
    ("Super Famicom", "Some JP Game"),
    ("Nintendo Switch", "Generic Switch Game"),
]

print("--- Testing Region Detection ---")
for console, product in test_cases:
    region = ListingClassifier.detect_region(console, product)
    print(f"Console: {console:<20} | Product: {product:<20} -> Region: {region}")
