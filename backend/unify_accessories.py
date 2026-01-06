from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.models.product import Product
from app.models.game import Game
from app.services.consolidation import normalize_name, normalize_console, create_slug
import re

# Setup
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
db = Session(bind=engine)

def fix_schema():
    print("🔧 Checking Schema...")
    with engine.connect() as conn:
        # Check columns via PRAGMA (SQLite specific but effective here)
        # Note: If passing other DB types, use inspector. But we know it's SQLite locally.
        try:
            # Add game_slug
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN game_slug VARCHAR"))
                print("   -> Added column: game_slug")
            except Exception as e:
                # Likely already exists
                pass

            # Add variant_type
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN variant_type VARCHAR DEFAULT 'Standard'"))
                print("   -> Added column: variant_type")
            except Exception as e:
                pass
            
            conn.commit()
            print("✅ Schema Verified.")
        except Exception as main_e:
            print(f"⚠️ Schema Check Warning: {main_e}")

def unify_accessories():
    fix_schema()
    print("🚧 Starting Accessory Unification...")
    
    # 1. Fetch all Accessories and Controllers
    # We fetch ALL of them to ensure we catch everything.
    products = db.query(Product).filter(Product.genre.in_(['Accessories', 'Controllers'])).all()
    print(f"Found {len(products)} accessory items.")
    
    grouped = {}
    
    # 2. Group by (Console Family + Normalized Name)
    for p in products:
        # Normalize
        norm_name = normalize_name(p.product_name)
        if not norm_name: continue
        
        family_console = normalize_console(p.console_name)
        
        key = (family_console, norm_name)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(p)
        
    print(f"Grouped into {len(grouped)} unique unified items.")
    
    stats = {"created": 0, "updated": 0, "linked": 0}
    
    # 3. Create/Find Unified 'Game' Entities
    for (family_console, norm_name), items in grouped.items():
        # Create Slug
        slug = create_slug(family_console, norm_name)
        
        # Check if Game exists // OR Reuse existing if one is found linked to these items?
        # Ideally we search by slug to find the Canonical Game.
        game = db.query(Game).filter(Game.slug == slug).first()
        
        if not game:
            # Create New
            # Use metadata from the 'best' item (e.g. NTSC if avail)
            # Simple heuristic: First item
            master = items[0]
            
            # Clean Title 
            clean_title = master.product_name
            clean_title = re.sub(r'\((PAL|JP|NTSC|EU|US|UK|JAP|JAPAN|USA|EUR)\)', '', clean_title, flags=re.IGNORECASE)
            clean_title = re.sub(r'\[.*?\]', '', clean_title)
            clean_title = clean_title.strip()
            
            game = Game(
                console_name=family_console,
                title=clean_title,
                slug=slug,
                description=master.description,
                genre=master.genre, # 'Accessories' or 'Controllers'
                developer=master.developer,
                publisher=master.publisher,
                release_date=master.release_date
            )
            db.add(game)
            db.flush() # Get ID
            stats["created"] += 1
        else:
            stats["updated"] += 1
            
        # 4. Link Items
        for p in items:
            p.game_id = game.id
            p.game_slug = game.slug
            
            # Determine Variant
            variant = "Standard"
            name_upper = (p.product_name or "").upper()
            if "PAL" in name_upper: variant = "PAL"
            elif "JAPAN" in name_upper or "JP" in name_upper: variant = "JP"
            elif "NTSC" in name_upper or "USA" in name_upper: variant = "NTSC"
            
            p.variant_type = variant
            stats["linked"] += 1
            
    db.commit()
    print("✅ Unification Complete!")
    print(stats)

if __name__ == "__main__":
    unify_accessories()
