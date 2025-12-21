import sys
import os
import time
import random
import argparse
from datetime import datetime, timedelta
from typing import List

# Add backend to path so we can import app modules
# Robust fix for Render deployment: Try to find 'backend' dir relative to this file
try:
    current_dir = os.path.dirname(os.path.abspath(__file__)) # .../backend/app/workers
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir))) # .../backend
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
except Exception:
    pass

from sqlalchemy.orm import configure_mappers

from app.db.session import SessionLocal
# Core models - Import via package to ensure all are loaded
from app.models import Product, Listing
# Services
from app.services.amazon_scraper import AmazonScraper
from app.services.listing_classifier import ListingClassifier

# Force SQLAlchemy to resolve all relationships
configure_mappers()

class AmazonWorker:
    def __init__(self, region_type: str, console_filter: str = None):
        self.region_type = region_type.upper() # PAL, NTSC, JP
        self.console_filter = console_filter
        self.scraper = AmazonScraper()
        
        # Domain Pools
        self.domains = self._get_domains(self.region_type)
        print(f"🤖 [Worker {self.region_type}] Initialized with domains: {self.domains}")
        if self.console_filter:
            print(f"🎯 Target Console: {self.console_filter}")

    def _get_domains(self, region: str) -> List[str]:
        if region == "PAL":
            return [
                "amazon.fr", "amazon.de", "amazon.co.uk", "amazon.it", "amazon.es", 
                "amazon.nl", "amazon.se", "amazon.pl", "amazon.com.be"
            ]
        elif region == "JP":
            return ["amazon.co.jp"]
        else: # NTSC
            return ["amazon.com", "amazon.ca"]

    def run(self):
        print(f"🚀 [Worker {self.region_type}] Started successfully.")
        db = SessionLocal()
        try:
            while True:
                try:
                    # 1. Fetch Candidates (Oldest updated first)
                    products = self._get_next_batch(db)
                    
                    if not products:
                        print(f"😴 [Worker {self.region_type}] No products found. Sleeping 60s...")
                        time.sleep(60)
                        continue

                    print(f"📦 [Worker {self.region_type}] Batch size: {len(products)} products. Starting rotation...")

                    # 2. Process Batch with Domain Rotation
                    for i, product in enumerate(products):
                        # Pick domain: Round-robin based on valid domains
                        domain = self.domains[i % len(self.domains)]
                        
                        try:
                            self._process_product(db, product, domain)
                        except Exception as e:
                            print(f"⚠️ [Worker {self.region_type}] Error processing product {product.id}: {e}")
                            db.rollback() # Ensure DB session is clean
                        
                        # 3. Dynamic Sleep (Anti-Ban)
                        if len(self.domains) > 1:
                            sleep_time = random.uniform(5, 12) # Fast rotation
                        else:
                            sleep_time = random.uniform(20, 40) # Slow single domain
                        
                        print(f"⏳ [Worker {self.region_type}] Sleeping {sleep_time:.1f}s...")
                        time.sleep(sleep_time)
                
                except Exception as e:
                    print(f"🔥 [Worker {self.region_type}] Critical Loop Error: {e}")
                    db.rollback()
                    time.sleep(60) # Prevent rapid crash loop

        except KeyboardInterrupt:
            print("🛑 Worker stopping...")
        finally:
            db.close()

    def _get_next_batch(self, db, limit: int = 20):
        """
        Get products that match the region criteria and haven't been scraped recently.
        """
        query = db.query(Product)
        
        # Filter by Console Name based on Region logic (using a simplified check or exact match)
        # Ideally we'd store a 'region' column, but we'll filter in Python or use Like
        if self.console_filter:
           query = query.filter(Product.console_name == self.console_filter)
        
        # Order by last_scraped asc (nulls first usually default, or use explicit)
        # We fetch a bit more to filter by region in python if needed
        candidates = query.order_by(Product.last_scraped.nullsfirst(), Product.last_scraped.asc()).limit(limit * 5).all()
        
        # Filter valid region candidates in Python (safe fallback)
        valid_batch = []
        for p in candidates:
            # Check region compatibility using the classifier logic
            region = ListingClassifier.detect_region(p.console_name, p.product_name)
            
            # Strict Logic:
            # We enforce region compatibility. 
            # Default fallback in classifier is now NTSC for unmarked consoles.
            # So generic "Playstation 5" -> NTSC, which prevents PAL worker from scraping it.
            # PAL games must be explicitly marked or have PAL console name.
            
            is_compatible = True
            if region and region != self.region_type:
                # E.g. Worker is NTSC, Product is PAL -> Skip
                is_compatible = False
                
            if is_compatible:
                valid_batch.append(p)
                if len(valid_batch) >= limit:
                    break
                    
        return valid_batch

    def _process_product(self, db, product, domain):
        print(f"🔎 Scanning [{domain}] for: {product.product_name} ({product.console_name})")
        
        # STRICT SAFETY CHECK: Re-verify region compatibility at processing time
        # This prevents cases where a product might have been fetched but is actually incompatible
        # or if the classification logic changed/is ambiguous.
        detected_region = ListingClassifier.detect_region(product.console_name, product.product_name)
        
        # If product is explicitly detected as a DIFFERENT region, abort.
        # Note: If detected_region is None (ambiguous), it typically defaults to NTSC in classifier,
        # so we must trust the classifier's default or handle it.
        # Here we trust the classifier completely.
        if detected_region and detected_region != self.region_type:
             print(f"⚠️ [Worker {self.region_type}] Skipping {product.product_name} (Detected as {detected_region}) - Region Mismatch")
             return

        # Generate sanitized query
        query = ListingClassifier.clean_search_query(product.product_name, product.console_name)
        
        result = self.scraper.search_product(query, domain)
        
        if result:
            print(f"   ✅ Found: {result['title']} - {result['price']} {result['currency']}")
            self._save_listing(db, product.id, result)
        else:
            print("   ❌ No result found.")

        # Mark as scraped even if nothing found, to cycle queue
        product.last_scraped = datetime.utcnow()
        db.commit()

    def _save_listing(self, db, product_id, data):
        # STRICT SAFETY CHECK: Verify Domain/URL validity for this worker
        # Prevents writing "amazon.fr" links if this is the NTSC worker etc.
        # Extract domain from URL or use logic
        url = data.get('url', '').lower()
        
        is_valid_domain = False
        for valid_domain in self.domains:
            if valid_domain in url:
                is_valid_domain = True
                break
        
        if not is_valid_domain:
             print(f"🛑 [Worker {self.region_type}] BLOCKED SAVING: URL {url} does not match allowed domains {self.domains}")
             return

        # Check if active listing exists for this source/domain
        existing = db.query(Listing).filter(
            Listing.product_id == product_id,
            Listing.seller_name == data['seller_name']
        ).first()

        if existing:
            existing.price = data['price']
            existing.url = data['url']
            existing.last_updated = datetime.utcnow()
        else:
            new_listing = Listing(
                product_id=product_id,
                source="Amazon",
                title=data['title'],
                price=data['price'],
                currency=data['currency'],
                condition="New", # Amazon default
                url=data['url'],
                image_url=data.get('image_url'),
                seller_name=data['seller_name'],
                external_id=data.get('asin')
            )
            db.add(new_listing)
        
        db.commit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Amazon Region Worker')
    parser.add_argument('--type', type=str, required=True, help='Region Type: PAL, NTSC, JP')
    parser.add_argument('--console', type=str, help='Target Console Name (e.g., "Playstation 5")')
    
    args = parser.parse_args()
    
    worker = AmazonWorker(args.type, args.console)
    worker.run()
