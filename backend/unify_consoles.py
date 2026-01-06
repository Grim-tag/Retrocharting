import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.game import Game
import re

def slugify(text: str) -> str:
    # 1. Lowercase
    text = text.lower()
    # 2. Remove brackets
    text = re.sub(r'[\[\]\(\)]', '', text)
    # 3. Alphanumeric + hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    # 4. Strip edges
    return text.strip('-')

def unify_consoles():
    db = SessionLocal()
    try:
        print("--- Unifying Consoles (Hardware) ---")
        
        # 1. Find target products
        # Genre 'Systems' captures consoles.
        products = db.query(Product).filter(
            Product.genre == 'Systems',
            Product.game_slug == None
        ).all()
        
        print(f"Found {len(products)} console products needing unification.")
        
        grouped = {}
        for p in products:
            key = (p.product_name, p.console_name)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(p)
            
        print(f"grouped into {len(grouped)} unique system entities.")
        
        new_games = 0
        updated_products = 0
        
        for (title, console), prod_list in grouped.items():
            # Check if Game exists
            # We try to match by Title + Console
            # Note: For Consoles, the Title IS the console name usually (e.g. "Nintendo 64" on console "Nintendo 64")
            # Or "Analogue 3D" on console "Nintendo 64".
            
            game = db.query(Game).filter(
                Game.title == title,
                Game.console_name == console
            ).first()
            
            if not game:
                # Create slug:
                # If title == console_name, slug = console_slug (e.g. "nintendo-64")
                # But "nintendo-64" might already interpret as a CATEGORY slug?
                # Game slugs live at /games/[slug].
                # /games/nintendo-64 is the List page.
                # So we CANNOT have a game slug identical to a system slug if they share namespace.
                # But they don't share namespace in the new router?
                # /games/[slug] -> ID logic vs Game Logic.
                
                # Wait: Layout Check.
                # /games/nintendo-64 -> Is it a Game Page or a Console List?
                # Currently: /games/[slug] checks `isSystemSlug(slug)`.
                # If "nintendo-64" is a system, it renders the LIST.
                # So we CANNOT use "nintendo-64" as the game slug for the console hardware page.
                
                # We should append "-console" or "-system" suffix for the hardware page?
                # e.g. "nintendo-64-system" or "nintendo-64-console".
                
                base_slug = slugify(title)
                console_slug = slugify(console)
                
                full_slug = ""
                if base_slug == console_slug:
                     full_slug = f"{base_slug}-console"
                else:
                    # e.g. "analogue-3d" on "nintendo-64"
                    # standard game logic: "analogue-3d-nintendo-64"
                    if console_slug in base_slug:
                        full_slug = base_slug
                    else:
                        full_slug = f"{base_slug}-{console_slug}"
                
                # Verify uniqueness
                original_slug = full_slug
                counter = 1
                while db.query(Game).filter(Game.slug == full_slug).first():
                    full_slug = f"{original_slug}-{counter}"
                    counter += 1
                
                game = Game(
                    title=title,
                    console_name=console,
                    slug=full_slug,
                    genre='Systems',
                    description=prod_list[0].description,
                    release_date=prod_list[0].release_date,
                    publisher=prod_list[0].publisher,
                    developer=prod_list[0].developer
                )
                db.add(game)
                db.flush() # get ID
                new_games += 1
                print(f"Created System: {title} -> {full_slug}")
            
            # Link products
            for p in prod_list:
                p.game_id = game.id
                p.game_slug = game.slug
                updated_products += 1
        
        db.commit()
        print(f"DONE. Created {new_games} Games. Updated {updated_products} Products.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    unify_consoles()
