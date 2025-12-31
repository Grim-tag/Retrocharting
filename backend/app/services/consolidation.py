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
        # PURE STREAMING APPROACH
        # We order by Console then Name to process them in order.
        # This allows formatting groups on the fly without loading everything.
        
        products_query = db.query(Product).filter(
            Product.game_id == None,
            Product.product_name != None
        ).order_by(Product.console_name, Product.product_name)
        
        total_orphans = products_query.count() # Fast count
        print(f"Found {total_orphans} orphans to process.")
        
        log_entry.error_message = f"Found {total_orphans} orphans. Starting Streaming Consolidator..."
        db.commit()
        
        # Stream results in chunks of 1000 to avoid RAM explosion
        product_stream = products_query.yield_per(1000)
        
        stats = {
            "games_created": 0,
            "products_linked": 0,
            "skipped": 0,
            "orphans_found": total_orphans
        }
        
        # Buffer for current group
        current_monitor_key = None # (console, norm_name)
        current_group = []
        
        processed_count = 0
        
        def commit_group(console, norm_name, product_list):
            if not product_list or not norm_name: return
            
            # Check IDEMPOTENCY
            slug = create_slug(console, norm_name)
            existing_game = db.query(Game).filter(Game.slug == slug).first()
            
            if not existing_game:
                # Create Master
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
                    db.flush()
                stats["games_created"] += 1
            
            # Link items
            joined_count = 0
            if existing_game or dry_run:
                for p in product_list:
                    if not dry_run: p.game_id = existing_game.id
                    
                    # Deduce Variant
                    if "(PAL)" in p.product_name or "PAL" in (p.product_name or ""):
                         variant = "PAL"
                    elif "(JP)" in p.product_name or "Japan" in (p.product_name or ""):
                         variant = "JP"
                    elif "(NTSC)" in p.product_name or "USA" in (p.product_name or ""):
                         variant = "NTSC"
                    else:
                         variant = "Standard"
                    
                    if not dry_run: p.variant_type = variant
                    joined_count += 1
            return joined_count

        # ITERATE STREAM
        for p in product_stream:
            processed_count += 1
            
            # Periodic Log Update
            if processed_count % 2500 == 0:
                log_entry.items_processed = processed_count
                log_entry.error_message = f"Streaming: {processed_count}/{total_orphans} items..."
                db.commit()

            # Veto
            if "collector" in p.product_name.lower():
                stats['skipped'] += 1
                continue
                
            norm_name = normalize_name(p.product_name)
            if not norm_name: continue
            
            key = (p.console_name, norm_name)
            
            if key != current_monitor_key:
                # Group Changed! Commit previous group
                if current_monitor_key:
                    linked = commit_group(current_monitor_key[0], current_monitor_key[1], current_group)
                    stats["products_linked"] += (linked or 0)
                
                # Start new group
                current_monitor_key = key
                current_group = [p]
            else:
                # Continue group
                current_group.append(p)
                
        # Commit final group
        if current_monitor_key and current_group:
             linked = commit_group(current_monitor_key[0], current_monitor_key[1], current_group)
             stats["products_linked"] += (linked or 0)
             
        if not dry_run:
            db.commit()
            
        # Success
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

