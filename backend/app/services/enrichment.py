from datetime import datetime, timedelta
import re
import requests
from io import BytesIO
from PIL import Image

from app.db.session import SessionLocal
from app.models.product import Product as ProductModel
from app.services.igdb import igdb_service
from app.core.config import settings

def enrich_product_with_igdb(product_id: int):
    """
    Background task to fetch details from IGDB and update the product.
    MOVED from app/routers/products.py
    """
    db = SessionLocal()
    try:
        product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
        if not product:
            return

        print(f"IGDB: Attempting to enrich {product.product_name}...")
        
        # 1. Search for game
        # Clean name logic? Remove [PAL] [JP] etc?
        search_query = product.product_name
        # Simple cleanup
        for term in ['[PAL]', '[JP]', '[NTSC]', 'PAL', 'NTSC-U', 'NTSC-J']:
             search_query = search_query.replace(term, '').strip()

        games = igdb_service.search_game(search_query)
        if not games:
            print(f"IGDB: No match found for {search_query}")
            return

        # Simple matching strategy: Take the first result or closest release date?
        # For now, take first.
        match = games[0]
        game_id = match['id']
        
        # 2. Get Details
        details = igdb_service.get_game_details(game_id)
        if not details:
            return
            
        # 3. Update Product
        updated = False
        
        if not product.description and 'summary' in details:
            product.description = details['summary']
            updated = True
            
        if not product.release_date and 'first_release_date' in details:
            # IGDB returns timestamp
            ts = details['first_release_date']
            product.release_date = datetime.fromtimestamp(ts)
            updated = True
            
        if (not product.genre or product.genre == 'Unknown') and 'genres' in details:
            # "Action, Adventure" -> "Action & Adventure"
            genre_names = [g['name'] for g in details['genres']]
            
            final_genre = "Unknown"
            
            # Taxonomy Mapping (IGDB -> PriceCharting)
            if "Role-playing (RPG)" in genre_names:
                final_genre = "RPG"
            elif "Action" in genre_names or "Adventure" in genre_names:
                 final_genre = "Action & Adventure"
            elif "Fighting" in genre_names:
                 final_genre = "Fighting"
            elif "Platform" in genre_names:
                 final_genre = "Platformer"
            elif "Shooter" in genre_names:
                 final_genre = "FPS"
            elif "Racing" in genre_names:
                 final_genre = "Racing"
            elif "Sport" in genre_names:
                 final_genre = "Sports"
            elif "Strategy" in genre_names or "Real Time Strategy (RTS)" in genre_names or "Turn-based strategy (TBS)" in genre_names:
                 final_genre = "Strategy"
            elif "Simulator" in genre_names:
                 final_genre = "Simulation"
            elif "Puzzle" in genre_names:
                 final_genre = "Puzzle"
            elif "Arcade" in genre_names:
                 final_genre = "Arcade"
            else:
                 # Fallback to first available or standard join
                 final_genre = genre_names[0] if genre_names else "Unknown"

            product.genre = final_genre
            updated = True
            
        # Developer / Publisher
        if 'involved_companies' in details:
            companies = details['involved_companies']
            pub = [c['company']['name'] for c in companies if c.get('publisher', False)]
            dev = [c['company']['name'] for c in companies if c.get('developer', False)]
            
            if (not product.publisher) and pub:
                product.publisher = pub[0] # Take first
                updated = True
            
            if (not product.developer) and dev:
                product.developer = dev[0]
                updated = True
                
        # ESRB Rating
        # IGDB Rating Enum: 6=RP, 7=EC, 8=E, 9=E10+, 10=T, 11=M, 12=AO
        if not product.esrb_rating and 'age_ratings' in details:
            esrb_map = {8: "E", 9: "E10+", 10: "T", 11: "M", 12: "AO", 7: "EC", 6: "RP"}
            for r in details['age_ratings']:
                if r.get('category') == 1: # ESRB
                    rating_id = r.get('rating')
                    if rating_id in esrb_map:
                        product.esrb_rating = esrb_map[rating_id]
                        updated = True
                        break

        # Players
        if not product.players:
            # Try multiplayer modes first for exact numbers
            if 'multiplayer_modes' in details:
                # Find max players
                max_players = 1
                for mode in details['multiplayer_modes']:
                    off = mode.get('offlinemax', 0)
                    on = mode.get('onlinemax', 0)
                    coop = mode.get('offlinecoopmax', 0)
                    max_players = max(max_players, off, on, coop)
                
                if max_players > 1:
                    product.players = str(max_players)
                    updated = True
            
            # Fallback to game modes if "Single player" only
            if not product.players and 'game_modes' in details:
                modes = [m['name'] for m in details['game_modes']]
                if "Multiplayer" in modes or "Co-operative" in modes:
                    # If we didn't get a number from multiplayer_modes but it says multiplayer... invalid?
                    # Let's just leave it blank or default/guess? 
                    # Actually if we fail to get a number, 1 is safer or "1-2"?
                    pass
                elif "Single player" in modes:
                    product.players = "1"
                    updated = True

        # 4. Update Image if missing or generic
        if 'cover' in details and 'url' in details['cover']:
             cover_url = details['cover']['url']
             # Format: //images.igdb.com/igdb/image/upload/t_thumb/co123.jpg
             # We want better quality: t_cover_big or t_720p or t_1080p
             cover_url = f"https:{cover_url}".replace("t_thumb", "t_cover_big")
             
             if not product.image_url or "pricecharting" in product.image_url or product.image_url == "":
                 try:
                     # Download and Store BLOB
                     img_resp = requests.get(cover_url, timeout=10)
                     if img_resp.status_code == 200:
                         # Process to WebP
                         image = Image.open(BytesIO(img_resp.content))
                         if image.mode in ("RGBA", "P"): image = image.convert("RGB")
                         buffer = BytesIO()
                         image.save(buffer, "WEBP", quality=80)
                         product.image_blob = buffer.getvalue()
                         
                         # Generate SEO naming
                         def clean_slug(text):
                            return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
                         
                         slug = clean_slug(f"{product.product_name} {product.console_name}")
                         product.image_url = f"{settings.API_BASE_URL}/api/v1/products/{product.id}/image/{slug}.webp"
                         updated = True
                         print(f"IGDB: Downloaded and stored image for {product.product_name}")
                     else:
                         # Fallback to URL if download fails
                         product.image_url = cover_url
                         updated = True
                 except Exception as e:
                     print(f"IGDB Image Download Error: {e}")
                     # Fallback
                     product.image_url = cover_url
                     updated = True

        if updated:
            db.commit()
            print(f"IGDB: Successfully enriched {product.product_name}")
        else:
            print(f"IGDB: Data found but no fields needed update for {product.product_name}")

    except Exception as e:
        print(f"IGDB Enrichment Error: {e}")
    finally:
        db.close()
