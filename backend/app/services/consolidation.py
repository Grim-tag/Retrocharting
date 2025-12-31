from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.product import Product
from app.models.game import Game
from app.models.scraper_log import ScraperLog
from datetime import datetime
import re
import json

def normalize_name(text: str) -> str:
    """
    Simpler normalization for matching.
    "Super Mario 64" -> "super mario 64"
    "Super Mario 64 (PAL)" -> "super mario 64"
    """
    if not text: return ""
    text = text.lower().strip()
    
    # Remove Region tags strictly for matching
    text = re.sub(r'\(pal\)', '', text)
    text = re.sub(r'\(ntsc\)', '', text)
    text = re.sub(r'\(jp\)', '', text)
    text = re.sub(r'\[.*?\]', '', text) # Remove [Import] etc
    
    # Remove special chars
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text.strip()

def create_slug(console: str, title: str) -> str:
    """
    Creates SEO friendly slug: "nintendo-64-super-mario-64"
    """
    clean_console = re.sub(r'[^a-z0-9]', '-', console.lower()).strip('-')
    clean_title = re.sub(r'[^a-z0-9]', '-', title.lower()).strip('-')
    while '--' in clean_title: clean_title = clean_title.replace('--', '-')
    return f"{clean_console}-{clean_title}"

def run_consolidation(db: Session, dry_run: bool = False):
    """
    Main logic to group products into Games.
    """
    mode = "Dry Run" if dry_run else "LIVE"
    print(f"Starting {mode} consolidation...")
    
    # Init Log
    log_entry = ScraperLog(
        source=f"consolidation_{'dry' if dry_run else 'live'}",
        status="running",
        items_processed=0
    )
    db.add(log_entry)
    db.commit() # Get ID
    db.refresh(log_entry)
    
    try:
        # 1. Fetch all products without a Game ID using yield_per to save RAM
        # But we need them all to group...
        # Option: Process console by console to reduce working set?
        # Let's try simpler: Just Periodic Updates first.
        
        products_query = db.query(Product).filter(
            Product.game_id == None,
            Product.product_name != None
        )
        
        total_orphans = products_query.count()
        print(f"Found {total_orphans} orphans to process.")
        
        # Update log initial count
        log_entry.error_message = f"Found {total_orphans} orphans. Grouping..."
        db.commit()
        
        products = products_query.all() # Still risky if > 50k items
        
        stats = {
            "games_created": 0,
            "products_linked": 0,
            "skipped": 0,
            "orphans_found": total_orphans
        }
        
        # Group in memory
        groups = {}
        grouping_count = 0
        
        for p in products:
            grouping_count += 1
            if grouping_count % 5000 == 0:
                log_entry.items_processed = grouping_count
                log_entry.error_message = f"Grouping in memory: {grouping_count}/{total_orphans}"
                db.commit()

            # Veto Logic
            if "collector" in p.product_name.lower():
                stats['skipped'] += 1
                continue
                
            norm_name = normalize_name(p.product_name)
            key = (p.console_name, norm_name)
            
            if key not in groups:
                groups[key] = []
            groups[key].append(p)
            
        # Process Groups
        total_groups = len(groups)
        processed_groups = 0
        
        log_entry.error_message = f"Processing {total_groups} groups..."
        db.commit()
        
        for (console, norm_name), product_list in groups.items():
            processed_groups += 1
            if processed_groups % 100 == 0:
                log_entry.items_processed = stats["products_linked"]
                log_entry.error_message = f"Processing groups: {processed_groups}/{total_groups}"
                db.commit()

            if not norm_name: continue
            
            # Check if Game already exists (Idempotency)
            slug = create_slug(console, norm_name)
            
            # OPTIMIZATION: Cache existing games in memory? 
            # Or assume we just hit DB. 2000 queries is fine. 20k is slow.
            existing_game = db.query(Game).filter(Game.slug == slug).first()
            
            if not existing_game:
                # Create Master Game
                sorted_products = sorted(product_list, key=lambda x: x.release_date or datetime.max.date())
                master_source = sorted_products[0]
                
                if not dry_run:
                    existing_game = Game(
                        console_name=console,
                        title=master_source.product_name,
                        slug=slug,
                        description=master_source.description,
                        genre=master_source.genre,
                        developer=master_source.developer,
                        publisher=master_source.publisher,
                        release_date=master_source.release_date
                    )
                    db.add(existing_game)
                    db.flush() # Get ID
                
                stats["games_created"] += 1
            
            # Link Products
            if existing_game or dry_run:
                for p in product_list:
                    if not dry_run: p.game_id = existing_game.id
                    
                    # Deduce Variant Type
                    if "(PAL)" in p.product_name or "PAL" in (p.product_name or ""):
                        variant = "PAL"
                    elif "(JP)" in p.product_name or "Japan" in (p.product_name or ""):
                        variant = "JP"
                    elif "(NTSC)" in p.product_name or "USA" in (p.product_name or ""):
                        variant = "NTSC"
                    else:
                        variant = "Standard"
                    
                    if not dry_run: p.variant_type = variant
                        
                    stats["products_linked"] += 1
                    
        if not dry_run:
            db.commit()
            
        # Update Log Success
        log_entry.status = "success"
        log_entry.end_time = datetime.utcnow()
        log_entry.items_processed = stats["products_linked"]
        log_entry.error_message = json.dumps(stats) 
        db.commit()
        
        return stats

    except Exception as e:
        log_entry.status = "error"
        log_entry.end_time = datetime.utcnow()
        log_entry.error_message = str(e)
        db.commit()
        raise e

