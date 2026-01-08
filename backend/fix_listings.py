from app.db.session import SessionLocal
from app.models.listing import Listing
from sqlalchemy import or_

def fix_listings():
    db = SessionLocal()
    print("Starting Listing Re-Classification...")
    
    # Fetch all listings that aren't already classified
    # We want to re-check everything just in case, but maybe optimize?
    # Let's check everything.
    listings = db.query(Listing).all()
    print(f"Checking {len(listings)} listings...")
    
    count_manual = 0
    count_box = 0
    
    for item in listings:
        title = item.title.upper() if item.title else ""
        
        box_terms = ['BOITE', 'BOX', 'CASE', 'EMPTY BOX', 'VIDE']
        manual_terms = ['NOTICE', 'MANUAL', 'INSTRUCTION', 'BOOKLET', 'LIVRET']
        no_game_terms = ['PAS DE JEU', 'NO GAME', 'EMPTY', 'VIDE', 'BOITE SEULE', 'NOTICE SEULE', 'MANUAL ONLY', 'BOX ONLY']
        
        has_no_game = any(t in title for t in no_game_terms)
        has_box = any(t in title for t in box_terms)
        has_manual = any(t in title for t in manual_terms)
        is_complete = any(t in title for t in ['CIB', 'COMPLETE', 'COMPLET', 'AVEC JEU', 'WITH GAME', '+ JEU', '+ GAME'])
        
        new_condition = None
        
        if not is_complete:
            if has_no_game or (has_manual and "SEULE" in title) or (has_box and "SEULE" in title) or title.startswith("NOTICE") or title.startswith("BOITE"):
                 # Force check basic startsWith for "Notice pour..." "Boite pour..."
                 
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
                     
        if new_condition and item.condition != new_condition:
            item.condition = new_condition
            if new_condition == 'MANUAL_ONLY': count_manual += 1
            if new_condition == 'BOX_ONLY': count_box += 1
            
    db.commit()
    print(f"Detailed Classification Complete.")
    print(f"Marked {count_manual} as MANUAL_ONLY")
    print(f"Marked {count_box} as BOX_ONLY")
    db.close()

if __name__ == "__main__":
    fix_listings()
