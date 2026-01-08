from app.db.session import SessionLocal
from app.models.listing import Listing

def fix_listings_job():
    db = SessionLocal()
    print("Starting Listing Re-Classification Job...")
    
    try:
        listings = db.query(Listing).filter(Listing.condition.notin_(['BOX_ONLY', 'MANUAL_ONLY'])).all()
        
        count = 0
        for item in listings:
            title = item.title.upper() if item.title else ""
            
            box_terms = ['BOITE', 'BOX', 'CASE', 'EMPTY BOX', 'VIDE']
            manual_terms = ['NOTICE', 'MANUAL', 'INSTRUCTION', 'BOOKLET', 'LIVRET']
            no_game_terms = ['PAS DE JEU', 'NO GAME', 'EMPTY', 'VIDE', 'BOITE SEULE', 'NOTICE SEULE', 'MANUAL ONLY', 'BOX ONLY', 'POUR', 'FOR']
            
            # Start logic
            is_box = False
            is_manual = False
            
            # Explicit negative markers (Pas de jeu...)
            has_no_game = any(t in title for t in ['PAS DE JEU', 'NO GAME', 'EMPTY', 'VIDE', 'SEULE'])
            
            # Or "Notice pour..." / "Boite pour..." at start
            starts_with_extra = title.startswith("NOTICE") or title.startswith("BOITE") or title.startswith("MANUAL") or title.startswith("CASE") or title.startswith("EMPTY")
            
            should_check = has_no_game or starts_with_extra
            
            # Safe word exclusion
            is_complete = any(t in title for t in ['CIB', 'COMPLETE', 'COMPLET', 'AVEC JEU', 'WITH GAME', '+ JEU', '+ GAME'])
            
            if should_check and not is_complete:
                 has_box = any(t in title for t in box_terms)
                 has_manual = any(t in title for t in manual_terms)
                 
                 new_condition = None
                 if has_manual and not has_box:
                     new_condition = 'MANUAL_ONLY'
                 elif has_box and not has_manual:
                     new_condition = 'BOX_ONLY'
                 elif has_box and has_manual:
                     new_condition = 'BOX_ONLY'
                 elif has_manual:
                     new_condition = 'MANUAL_ONLY'
                 elif has_box:
                     new_condition = 'BOX_ONLY'
                     
                 if new_condition:
                     item.condition = new_condition
                     count += 1
                     
        db.commit()
        print(f"Listing Fix Complete. Updated {count} items.")
    except Exception as e:
        print(f"Listing Fix Error: {e}")
    finally:
        db.close()
