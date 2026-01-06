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
    
    grouped = {}
    for p in products:
        key = (p.product_name, p.console_name)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(p)
        
    new_games = 0
    updated_products = 0
    
    for (title, console), prod_list in grouped.items():
        # Check if Game exists
        game = db.query(Game).filter(
            Game.title == title,
            Game.console_name == console
        ).first()
        
        if not game:
            base_slug = slugify(title)
            console_slug = slugify(console)
            
            full_slug = ""
            if base_slug == console_slug:
                    full_slug = f"{base_slug}-console"
            else:
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
    
    db.commit()
    return {
        "message": "Unification complete", 
        "created_games": new_games, 
        "updated_products": updated_products
    }
