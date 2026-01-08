from app.db.session import SessionLocal
from app.models.product import Product
from app.models.game import Game

db = SessionLocal()

def test_lookup(slug):
    print(f"Testing slug: {slug}")
    
    # 1. Remove Suffix
    clean_slug = slug
    known_suffixes = ['-prices-value', '-prix-cotes', '-prices', '-cote-prix']
    for suffix in known_suffixes:
        if clean_slug.endswith(suffix):
            clean_slug = clean_slug[:-len(suffix)]
            break
            
    print(f"Clean slug: {clean_slug}")
    
    slug_console_map = {
        "ps5": "Playstation 5",
        "ps4": "Playstation 4",
        "ps3": "Playstation 3",
        "ps2": "Playstation 2",
        "ps1": "Playstation",
        "nes": "Nintendo Entertainment System",
        "snes": "Super Nintendo",
        "n64": "Nintendo 64",
        "gcn": "GameCube",
        "gba": "Game Boy Advance",
        "gbc": "Game Boy Color",
        "genesis": "Sega Genesis",
        "dreamcast": "Sega Dreamcast",
        "saturn": "Sega Saturn",
        "xbox-series-x": "Xbox Series X",
        "xbox-one": "Xbox One",
        "xbox-360": "Xbox 360",
        "pc": "PC Games"
    }

    found_console_real_name = None
    title_slug_part = clean_slug

    sorted_keys = sorted(list(slug_console_map.keys()), key=len, reverse=True)
    
    for k in sorted_keys:
        if clean_slug.endswith(f"-{k}"):
            found_console_real_name = slug_console_map[k]
            title_slug_part = clean_slug[:-len(k)-1] 
            break
            
    print(f"Console: {found_console_real_name}")
    print(f"Title Part: {title_slug_part}")
    
    if found_console_real_name:
        # Debug: Check if console has products
        count = db.query(Product).filter(Product.console_name == found_console_real_name).count()
        print(f"Total products in {found_console_real_name}: {count}")

        # ROBUST MATCHING STRATEGY
        # 1. Fetch all candidate names for this console (id, name)
        # 2. Normalize both Slug and DB Name (remove all non-alphanumeric)
        # 3. Match
        
        candidates = db.query(Product.id, Product.product_name).filter(
            Product.console_name == found_console_real_name
        ).all()
        
        # Normalize Slug: remove hyphens, lower
        norm_slug = title_slug_part.replace("-", "").lower()
        print(f"Normalized Search: {norm_slug}")
        
        import re
        def normalize(s):
            return re.sub(r'[^a-z0-9]', '', (s or "").lower())

        found = None
        for cand in candidates:
            norm_cand = normalize(cand.product_name)
            if norm_slug == norm_cand:
                # Exact normalized match (Best)
                found = cand
                print("Exact Normalized Match!")
                break
            if norm_slug in norm_cand:
                # Partial match (Fallback)
                # print(f"Partial candidate: {cand.product_name}")
                if not found: found = cand # Take first
        
        if found:
             print(f"FOUND: {found.product_name} (ID: {found.id})")
        else:
             print("NOT FOUND via Normalization")

if __name__ == "__main__":
    test_lookup("10-yard-fight-nes-prix-cotes")
    test_lookup("baldurs-gate-pc-prices-value")
