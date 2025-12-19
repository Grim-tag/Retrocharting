from app.db.session import SessionLocal
from app.models.user import User
from app.models.price_history import PriceHistory
from app.models.listing import Listing
from app.models.collection_item import CollectionItem
from app.models.comment import Comment
from app.models.sniper import SniperResult
from app.models.sales_transaction import SalesTransaction
from app.models.product import Product
from sqlalchemy import or_

def fix_pc_genres():
    db = SessionLocal()
    try:
        # Get PC Games with weird genres
        # We also want to reset "Unknown" to NULL so they get picked up by enrichment job?
        # NO, enrichment job looks for description == None.
        # If description is missing, it will run anyway. 
        # But if description IS present but genre is "Unknown", enrichment won't run.
        # So we should force re-enrichment or fix them here?
        # We can't fix them here because we don't have IGDB data.
        # But we can map existing ones if they have weird names like "Action, Adventure".
        
        products = db.query(Product).filter(Product.console_name == "PC Games").all()
        
        updated_count = 0
        
        for p in products:
            original = p.genre
            if not original or original == "Unknown":
                continue
                
            new_genre = original
            
            # Comma separated list from previous enrichment?
            if "," in original:
                 parts = [x.strip() for x in original.split(",")]
                 
                 if "Action" in parts or "Adventure" in parts:
                     new_genre = "Action & Adventure"
                 elif "Role-playing (RPG)" in parts or "RPG" in parts:
                     new_genre = "RPG"
                 elif "Shooter" in parts or "FPS" in parts:
                     new_genre = "FPS"
                 elif "Platform" in parts:
                     new_genre = "Platformer"
                 elif "Strategy" in parts:
                     new_genre = "Strategy"
                 else:
                     new_genre = parts[0]
            
            # Simple re-mapping
            if new_genre == "Shooter": new_genre = "FPS"
            if new_genre == "Role-playing (RPG)": new_genre = "RPG"
            if new_genre == "Platform": new_genre = "Platformer"
            if new_genre == "Adventure": new_genre = "Action & Adventure"
            if new_genre == "Action": new_genre = "Action & Adventure"

            if new_genre != original:
                p.genre = new_genre
                updated_count += 1
                
        db.commit()
        print(f"Fixed {updated_count} PC genres.")
        
    finally:
        db.close()

if __name__ == "__main__":
    fix_pc_genres()
