
import sys
import os
import argparse
from datetime import datetime

# Ensure backend path is in sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.listing import Listing
from app.models.product import Product
from app.services.listing_classifier import ListingClassifier

def cleanup_listings(dry_run=False):
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        print(f"Checking {len(products)} products for region mismatches...")
        
        deleted_count = 0
        
        # Define allowed domains per region
        pal_domains = [
            "amazon.fr", "amazon.de", "amazon.co.uk", "amazon.it", "amazon.es", 
            "amazon.nl", "amazon.se", "amazon.pl", "amazon.com.be", "amazon.ie", "amazon.com.tr"
        ]
        ntsc_domains = ["amazon.com", "amazon.ca"]
        jp_domains = ["amazon.co.jp"]
        
        for p in products:
            # 1. Detect Strict Region
            region = ListingClassifier.detect_region(p.console_name, p.product_name)
            
            # 2. Get Amazon Listings
            listings = db.query(Listing).filter(
                Listing.product_id == p.id,
                Listing.source.ilike('%Amazon%') 
            ).all() 
            
            if not listings:
                continue

            for l in listings:
                url = l.url.lower() if l.url else ""
                
                is_bad = False
                reason = ""
                
                if region == "NTSC":
                    # Should ONLY be .com or .ca
                    # If URL contains any PAL or JP domain -> BAD
                    if any(d in url for d in pal_domains) or any(d in url for d in jp_domains):
                        is_bad = True
                        reason = "NTSC Product with Non-NTSC URL"
                        
                elif region == "PAL":
                    # Should ONLY be PAL
                    
                    if "amazon.co.jp" in url:
                        is_bad = True
                        reason = "PAL Product with JP URL"
                    elif "amazon.ca" in url:
                        is_bad = True
                        reason = "PAL Product with CA URL"
                    elif "amazon.com/" in url or "amazon.com?" in url or url.endswith("amazon.com"):
                        # Rough check for US, avoiding amazon.com.be
                        is_bad = True
                        reason = "PAL Product with US URL"

                elif region == "JP":
                    # Should ONLY be .co.jp
                    if not "amazon.co.jp" in url:
                        is_bad = True
                        reason = "JP Product with Non-JP URL"
                
                if is_bad:
                    print(f"DELETE [Prod {p.id}: {p.product_name} ({p.console_name})] -> Listing {l.id}: {l.price} {l.currency} ({url[:30]}...) -> {reason}")
                    if not dry_run:
                        db.delete(l)
                        deleted_count += 1
        
        if not dry_run:
            db.commit()
            print(f"Commit successful. Deleted {deleted_count} invalid listings.")
        else:
            print(f"Dry Run Finished. Would delete {deleted_count} invalid listings.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--execute', action='store_true', help='Run actual deletion')
    args = parser.parse_args()
    
    cleanup_listings(dry_run=not args.execute)
