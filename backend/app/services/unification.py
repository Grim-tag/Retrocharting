from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.game import Game
import re

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[\[\]\(\)]', '', text)
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def unify_consoles_logic(db: Session) -> dict:
    """
    Identifies 'Systems' genre products lacking a game_slug and creates/links them to Game entities.
    """
    print("--- Unifying Consoles (Hardware) ---")
    
    # 1. Find target products
    products = db.query(Product).filter(
        Product.genre == 'Systems',
        (Product.game_slug == None) | (Product.game_slug == "")
    ).all()
    
    print(f"DEBUG: Found {len(products)} consoles to unify.")
    
    if not products:
        return {"message": "No consoles needing unification found.", "created": 0, "updated": 0}
    
    print(f"DEBUG: Found {len(products)} consoles to unify.")
    
    grouped = {}
    for p in products:
        # Normalize key to be safe
        p_name = p.product_name or "Unknown Product"
        c_name = p.console_name or "Unknown Console"
        key = (p_name, c_name)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(p)
        
    new_games = 0
    updated_products = 0
    
    print(f"DEBUG: Processing {len(grouped)} unique groups...")

    for (title, console), prod_list in grouped.items():
        try:
            # Check if Game exists
            game = db.query(Game).filter(
                Game.title == title,
                Game.console_name == console
            ).first()
            
            if not game:
                base_slug = slugify(title)
                console_slug = slugify(console)
                
                full_slug = ""
                # Avoid "nintendo-64-nintendo-64-console"
                if base_slug == console_slug:
                        full_slug = f"{base_slug}-console"
                else:
                    if console_slug in base_slug:
                        full_slug = base_slug
                    else:
                        full_slug = f"{base_slug}-{console_slug}"
                
                # Clean up slug
                full_slug = full_slug.strip('-')
                if not full_slug:
                    full_slug = f"product-{prod_list[0].id}"

                # Verify uniqueness
                original_slug = full_slug
                counter = 1
                while db.query(Game).filter(Game.slug == full_slug).first():
                    full_slug = f"{original_slug}-{counter}"
                    counter += 1
                
                # Use metadata from first product
                p0 = prod_list[0]
                game = Game(
                    title=title,
                    console_name=console,
                    slug=full_slug,
                    genre='Systems',
                    description=p0.description,
                    release_date=p0.release_date,
                    publisher=p0.publisher,
                    developer=p0.developer
                )
                db.add(game)
                db.flush() 
                new_games += 1
            
            # Link products
            for p in prod_list:
                p.game_id = game.id
                p.game_slug = game.slug
                updated_products += 1
                
        except Exception as e:
            print(f"ERROR processing {title}: {e}")
            continue
    
    db.commit()
    print(f"DEBUG: Unification Finished. Created {new_games}, Updated {updated_products}")

    return {
        "message": "Unification complete", 
        "created_games": new_games, 
        "updated_products": updated_products
    }
