from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.product import Product
from app.models.game import Game
from app.models.scraper_log import ScraperLog
from datetime import datetime
import re
import json
import time

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

def normalize_console(console_name: str) -> str:
    """
    Strips region prefixes to group regional variants under one console family.
    'PAL Playstation 5' -> 'Playstation 5'
    'JP Playstation 5' -> 'Playstation 5'
    'NTSC Playstation 5' -> 'Playstation 5'
    """
    if not console_name: return "Unknown"
    s = console_name.strip()
    
    # Common prefixes
    s = re.sub(r'^(PAL|JP|NTSC|EU|US|UK)\s+', '', s, flags=re.IGNORECASE)
    # Common suffixes
    s = re.sub(r'\s+\((PAL|JP|NTSC|EU|US|UK)\)$', '', s, flags=re.IGNORECASE)
    
    return s.strip()

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
        # BATCH PROCESSING (FAST START)
        # Removed global count() and order_by() to avoid initial DB hang on 126k items.
        # We process whatever we find in chunks. Correctness is guaranteed by Game Slug idempotency.
        
        log_entry.error_message = "Starting Fast Batch Consolidator..."
        db.commit()
        
        stats = {
            "games_created": 0,
            "products_linked": 0,
            "skipped": 0,
            "orphans_found": "Unknown"
        }
        
        processed_total = 0
        BATCH_SIZE = 1000 
        last_id = 0
        
        while True:
            # Fetch Batch (ID Pagination for Re-runs)
            # We process ALL products to ensure logic updates (like console normalization) apply to existing data.
            batch = db.query(Product).filter(
                Product.id > last_id,
                Product.product_name != None
            ).order_by(Product.id.asc()).limit(BATCH_SIZE).all()
            
            if not batch:
                break
                
            # Process Batch
            batch_groups = {}
            for p in batch:
                last_id = p.id # Track progress
                # Veto removed: "Collector" items caused infinite loop (skipped but never updated).
                # We will process them normally.
                # if "collector" in p.product_name.lower():
                #    stats['skipped'] += 1
                #    continue
                    
                norm_name = normalize_name(p.product_name)
                if not norm_name: continue
                
                # CRITICAL Fix: Merge PAL/JP/NTSC consoles into one family key
                family_console = normalize_console(p.console_name)
                
                key = (family_console, norm_name)
                if key not in batch_groups:
                    batch_groups[key] = []
                batch_groups[key].append(p)
            
            # Commit Batch Groups
            for (family_console, norm_name), product_list in batch_groups.items():
                slug = create_slug(family_console, norm_name)
                
                # Check DB for existing match (Idempotency)
                existing_game = db.query(Game).filter(Game.slug == slug).first()
                
                if not existing_game:
                    if not dry_run:
                        # Pick best metadata: Priority to NTSC / Clean Titles
                        # We want the Global Page to look like "Super Mario 64" not "Super Mario 64 (PAL)"
                        def content_priority(p):
                            score = 0
                            # Cleaner titles (NTSC usually) get higher score
                            if "(PAL)" not in p.product_name and "(JP)" not in p.product_name:
                                score += 10
                            if "import" not in p.product_name.lower():
                                score += 5
                            # Fallback to release date (older is usually original)
                            if p.release_date:
                                # Convert date to timestamp for sorting (smaller timestamp = older = better?)
                                # Actually sticking to "Cleaner is better" is safer for our goal.
                                pass
                            return score

                        sorted_products = sorted(product_list, key=content_priority, reverse=True)
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
                db.commit()
            
            processed_total += len(batch)
            
            # Update Log
            log_entry.items_processed = processed_total
            log_entry.error_message = f"Batching: {processed_total} items processed..."
            db.commit() 
            
            # MEMORY & CPU MANAGEMENT
            # 1. Clear Identity Map to prevent OOM on large datasets (126k objects)
            log_id = log_entry.id
            db.expunge_all()
            
            # 2. Re-fetch Log Entry for next iteration (since it was detached)
            log_entry = db.query(ScraperLog).filter(ScraperLog.id == log_id).first()
            
            # 3. Yield CPU briefly to be nice to the scheduler
            time.sleep(0.05)
            
            if dry_run:
                if processed_total >= 5000:
                    log_entry.error_message = f"Dry Run Finished (Limit 5000)."
                    db.commit()
                    break
        
        # BROOM PHASE: SWEEP ORPHANS
        # Process items that failed normalization or were skipped.
        # We force-create a Game for them using raw product_name/slug.
        if not dry_run:
            orphans = db.query(Product).filter(Product.game_id == None).all()
            if orphans:
                log_entry.error_message = f"Broom Sweep: Processing {len(orphans)} orphans..."
                db.commit()
                
                for p in orphans:
                    norm_console = normalize_console(p.console_name)
                    # Fallback Slug
                    # If normalization failed (empty string), use raw product_name + ID to guarantee uniqueness
                    raw_slug = create_slug(norm_console, p.product_name)
                    if not raw_slug or len(raw_slug) < 3: 
                        raw_slug = f"{create_slug(norm_console, 'orphan')}-{p.id}"
                    
                    # Check existence (rare collision case)
                    existing_game = db.query(Game).filter(Game.slug == raw_slug).first()
                    
                    if not existing_game:
                        existing_game = Game(
                            console_name=norm_console,
                            title=p.product_name, # Use raw name
                            slug=raw_slug,
                            description=p.description,
                            genre=p.genre,
                            developer=p.developer,
                            publisher=p.publisher,
                            release_date=p.release_date
                        )
                        db.add(existing_game)
                        db.flush()
                        stats["games_created"] += 1
                        stats["orphans_found"] = "Swept"
                    
                    p.game_id = existing_game.id
                    p.variant_type = "Standard" # Default for orphans
                    stats["products_linked"] += 1
                
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

