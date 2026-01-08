import sys
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError

# Append path to access app modules
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.models.game import Game

def slugify(text):
    if not text:
        return "unknown"
    text = text.lower()
    text = re.sub(r'[\[\]\(\)]', '', text) # Remove brackets/parentheses
    text = re.sub(r'[^a-z0-9]+', '-', text) # Replace non-alphanumeric with hyphen
    return text.strip('-')

def format_console_name_legacy(name):
    # Mapping to match Frontend `utils.ts` `formatConsoleName`
    mapping = {
        "Playstation 5": "PS5",
        "Playstation 4": "PS4",
        "Playstation 3": "PS3",
        "Playstation 2": "PS2",
        "Playstation": "PS1",
        "Nintendo Entertainment System": "NES",
        "Super Nintendo": "SNES",
        "Nintendo 64": "N64",
        "GameCube": "GCN",
        "Game Boy Advance": "GBA",
        "Game Boy Color": "GBC",
        "Sega Genesis": "Genesis",
        "Sega Dreamcast": "Dreamcast",
        "Sega Saturn": "Saturn",
        "Xbox Series X": "Xbox Series X",
        "Xbox One": "Xbox One",
        "Xbox 360": "Xbox 360"
    }
    return mapping.get(name.strip(), name)

def migrate():
    db = SessionLocal()
    print("Starting Migration (Robust Mode)...")
    
    # 1. Rename PC Games Console
    print("Renaming 'PC Games' to 'PC'...")
    try:
        pc_games = db.query(Game).filter(Game.console_name == "PC Games").all()
        for game in pc_games:
            game.console_name = "PC"
        db.commit()
        print(f"Renamed {len(pc_games)} 'PC Games' entries to 'PC'.")
    except Exception as e:
        db.rollback()
        print(f"Error renaming PC Games: {e}")
        return

    # 2. Regenerate Slugs
    print("Regenerating Slugs for ALL games...")
    games = db.query(Game).all()
    total = len(games)
    
    # Pre-populate used slugs set to avoid collision
    # (Initially it contains all OLD slugs, but we will be updating them)
    # Actually, simpler: Track slugs we are ABOUT to write.
    # Since we are updating everything, we can just build a new set of "future_slugs"
    # But we must ensure we don't collide with ones we haven't processed yet?
    # No, because usually a rename moves it to a new space. 
    # The safest is to ensure uniqueness within the NEW set.
    
    existing_slugs = set()
    # Populate with current slugs just in case we don't change some
    # Actually, let's just track the ones we assign in this run.
    # If a slug stays the same, it's fine.
    
    # To be perfectly safe against existing DB constraints: 
    # We should know what's in the DB.
    # But since we are updating linearly, let's just keep track of what we have assigned SO FAR.
    # And if we hit a collision with a DB item we haven't touched yet... 
    # SQLAlchemy might complain on flush.
    # So correct approach:
    # 1. Fetch all games.
    # 2. Calculate new slugs.
    # 3. Resolve collisions in memory.
    # 4. Commit.
    
    # Let's populate the set with ALL current slugs first.
    slugs_in_use = {g.slug for g in games if g.slug}
    
    processed = 0
    updated_count = 0
    
    for game in games:
        processed += 1
        
        # Remove old slug from set (effectively "freeing" it)
        if game.slug in slugs_in_use:
            slugs_in_use.remove(game.slug)
            
        title_slug = slugify(game.title or "unknown")
        # Fix: Use mapped short name for slug generation (PS5 instead of Playstation 5)
        short_console_name = format_console_name_legacy(game.console_name or "unknown")
        console_slug = slugify(short_console_name)
        
        base_console_slug = re.sub(r'^(pal-|jp-|japan-)', '', console_slug)
        region_match = re.match(r'^(pal-|jp-|japan-)', console_slug)
        region_prefix = region_match.group(0) if region_match else ""
        
        if base_console_slug in title_slug:
             full_slug_part = title_slug
             if region_prefix and not full_slug_part.startswith(region_prefix):
                 full_slug_part = f"{region_prefix}{full_slug_part}"
        else:
             full_slug_part = f"{title_slug}-{console_slug}"
             
        base_new_slug = f"{full_slug_part}-prices-value"
        new_slug = base_new_slug
        
        # Collision Resolution
        counter = 1
        while new_slug in slugs_in_use:
            new_slug = f"{base_new_slug}-v{counter}"
            counter += 1
            
        # Add to set
        slugs_in_use.add(new_slug)
        
        if game.slug != new_slug:
            game.slug = new_slug
            updated_count += 1
        
        if processed % 1000 == 0:
            print(f"Progress: {processed}/{total} (Updated: {updated_count})")
            db.commit() # Commit chunks
    
    try:
        db.commit()
        print(f"Final Commit Successful.")
    except Exception as e:
        print(f"Error in final commit: {e}")

    print(f"Migration Complete. Total Processed: {processed}. Total Updated: {updated_count}.")
    db.close()

if __name__ == "__main__":
    migrate()
