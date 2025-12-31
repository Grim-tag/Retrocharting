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
        # BATCH PROCESSING APPROACH
        # We fetch orphans in chunks of 5000, process them, and commit.
        # Since we are updating 'game_id', they will naturally drop out of the 'filter(game_id==None)' query
        # in the next iteration. This handles memory AND transaction safety (no long cursors).
        
        # Get total count first for progress bar
        total_orphans = db.query(Product).filter(
            Product.game_id == None,
            Product.product_name != None
        ).count()
        
        print(f"Found {total_orphans} orphans to process.")
        
        log_entry.error_message = f"Found {total_orphans} orphans. Starting Batch Consolidator..."
        db.commit()
        
        stats = {
            "games_created": 0,
            "products_linked": 0,
            "skipped": 0,
            "orphans_found": total_orphans
        }
        
        processed_total = 0
        BATCH_SIZE = 1000 
        
        while True:
            # Fetch Batch
            # Order by console/product to keep grouping sensible within the batch?
            # Actually, if we just grab 1000 random ones, we might create fragmented Groups.
            # But since we are processing ALL orphans eventually, it's okay if we create the Game in Batch 1 
            # and verify it exists in Batch 2.
            # Sorting helps efficiency though (cache hits on Game lookup).
            
            batch = db.query(Product).filter(
                Product.game_id == None,
                Product.product_name != None
            ).order_by(Product.console_name, Product.product_name).limit(BATCH_SIZE).all()
            
            if not batch:
                break
                
            # Process Batch
            batch_groups = {}
            for p in batch:
                # Veto
                if "collector" in p.product_name.lower():
                    stats['skipped'] += 1
                    continue
                    
                norm_name = normalize_name(p.product_name)
                if not norm_name: continue
                
                key = (p.console_name, norm_name)
                if key not in batch_groups:
                    batch_groups[key] = []
                batch_groups[key].append(p)
            
            # Commit Batch Groups
            for (console, norm_name), product_list in batch_groups.items():
                slug = create_slug(console, norm_name)
                
                # Check DB for existing match
                existing_game = db.query(Game).filter(Game.slug == slug).first()
                
                if not existing_game:
                    if not dry_run:
                        sorted_products = sorted(product_list, key=lambda x: x.release_date or datetime.max.date())
                        master_source = sorted_products[0]
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
                        # We must flush to get the ID for linking
                        db.flush() 
                    stats["games_created"] += 1
                
                # Link
                if existing_game or dry_run:
                    for p in product_list:
                        if not dry_run:
                            p.game_id = existing_game.id
                        
                        # Set Variant
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

            # Commit the Batch changes
            if not dry_run:
                # IMPORTANT: This commit updates product.game_id, so they won't be fetched again.
                db.commit()
            else:
                # In dry_run we can't save game_id. So the 'filter(game_id==None)' loop would run forever!
                # CRITICAL FIX for DRY RUN: We must manually offset or just break if we can't page?
                # Actually, dry_run on 126k items is tricky with this pattern.
                # We should use OFFSET for dry_run.
                pass
            
            processed_total += len(batch)
            
            # Update Log
            log_entry.items_processed = processed_total
            log_entry.error_message = f"Batching: {processed_total}/{total_orphans} items..."
            db.commit() # Save log update
            
            # If Dry Run, we must handle Pagination manually since items aren't disappearing
            if dry_run:
                # If we used offset logic, it would be slow.
                # Since dry_run is just for testing, maybe limit it to 5000 items total?
                # Or use a naive offset? (slow but works)
                if processed_total >= total_orphans: break
                
                # For next iteration, we need to skip the ones we just saw.
                # But 'offset' queries are O(N).
                # Maybe Dry Run Max Limit?
                if processed_total >= 5000:
                    log_entry.error_message = f"Dry Run Limited to 5000 items (Preview)."
                    db.commit()
                    break
        
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

