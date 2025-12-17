from app.db.session import SessionLocal
from app.models.product import Product as ProductModel
from app.models.listing import Listing
from app.services.ebay_client import ebay_client
from app.services.amazon_client import amazon_client
from app.services.listing_classifier import ListingClassifier
from datetime import datetime

class PricingService:
    @staticmethod
    def update_listings(product_id: int):
        """
        Background task logic to fetch listings from eBay/Amazon and update DB.
        REFACTORED V2: Prevents Database Connection Holding.
        """
        print(f"[PricingService] Starting update for Product {product_id}")
        
        # --- STEP 1: READ CONTEXT (Short DB Session) ---
        search_context = {}
        db = SessionLocal()
        try:
            product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
            if not product:
                print(f"[PricingService] Product {product_id} not found.")
                return
            
            # Extract primitive data needed for search logic so we can close DB
            search_context['product_id'] = product.id
            search_context['product_name'] = product.product_name
            search_context['console_name'] = product.console_name
            search_context['genre'] = product.genre
            search_context['manual_only_price'] = product.manual_only_price
            search_context['box_only_price'] = product.box_only_price
            search_context['loose_price'] = product.loose_price
            
            # Logic Pre-Calculation (while we have the objects)
            target_console_region = ListingClassifier.detect_region(product.console_name)
            if not target_console_region:
                target_console_region = ListingClassifier.detect_region(product.product_name)
            
            if not target_console_region and product.genre != 'Accessories':
                 target_console_region = 'NTSC-U'
            search_context['target_region'] = target_console_region
            
            # --- REGION MAPPING LOGIC (New) ---
            amazon_domain = "amazon.fr"
            ebay_marketplace = "EBAY_FR"
            
            if target_console_region == 'NTSC-U':
                amazon_domain = "amazon.com"
                ebay_marketplace = "EBAY_US" 
            elif target_console_region == 'NTSC-J':
                amazon_domain = "amazon.co.jp"
                ebay_marketplace = "EBAY_US" # Fallback to US for broader JP coverage on eBay, or specific if needed.
                # User specified "ebay.com" for NTSC.
            
            search_context['amazon_domain'] = amazon_domain
            search_context['ebay_marketplace'] = ebay_marketplace

            search_context['query'] = ListingClassifier.clean_query(product.product_name, product.console_name)
            
            # Category ID
            category_id = "139973" # Games
            if product.genre == 'Systems':
                category_id = "139971"
            elif product.genre in ['Accessories', 'Controllers']:
                category_id = "54968"
            search_context['category_id'] = category_id
            
            # --- SONAR STRATEGY: CHECK CACHE VALIDITY (7 DAYS) ---
            should_fetch_amazon = True
            existing_amazon = db.query(Listing).filter(
                Listing.product_id == product_id,
                Listing.source == 'Amazon',
                Listing.status == 'active'
            ).order_by(Listing.last_updated.desc()).first()
            
            if existing_amazon and existing_amazon.last_updated:
                days_since = (datetime.utcnow() - existing_amazon.last_updated).days
                if days_since < 7:
                    should_fetch_amazon = False
                    print(f"[PricingService] Amazon Listing is Fresh ({days_since} days old). Skipping API call.")
            
            search_context['should_fetch_amazon'] = should_fetch_amazon
            search_context['product_object'] = product # Need strict object for smart search helper? No, object detached. 
            # We need to pass data dict or re-fetch in smart search? 
            # amazon_client.search_product_smart expects an object with .asin, .ean attributes.
            # We can create a simple dummy object or pass the detached product if lazy load not needed.
            # Detached product is safe for attribute access.
            
        except Exception as e:
            print(f"[PricingService] Read Error: {e}")
            return
        finally:
            # We keep 'product' in memory but it's detached. 
            # If we need it for search_product_smart, we should ensure we have the attrs.
            pass
            db.close()
            
        # --- STEP 2: EXTERNAL API CALLS (No DB Connection) ---
        query = search_context['query']
        category_id = search_context['category_id']
        ebay_marketplace = search_context.get('ebay_marketplace', 'EBAY_FR')
        amazon_domain = search_context.get('amazon_domain', 'amazon.fr')
        
        print(f"[PricingService] Query: '{query}' | Region: {target_console_region} | Market: {amazon_domain}/{ebay_marketplace} | DB Closed (Safe)")

        ebay_results = []
        amazon_results = []
        
        try:
            # Always fetch eBay (High Quota)
            ebay_results = ebay_client.search_items(query, limit=20, category_ids=category_id, marketplace_id=ebay_marketplace)
            print(f"[PricingService] eBay returned {len(ebay_results)} raw results.")
        except Exception as e:
            print(f"[PricingService] eBay Fetch Error: {e}")
                
        try:
            if search_context.get('should_fetch_amazon', True):
                # Use Smart Search (ASIN -> EAN -> Keyword)
                # We need to reconstruct a mini-product object for the helper or change helper?
                # Let's mock the product object structure expected by smart search
                class MockProduct:
                    def __init__(self, d): 
                        self.asin = getattr(d, 'asin', None)
                        self.ean = getattr(d, 'ean', None)
                        self.product_name = d.product_name
                        self.console_name = d.console_name
                
                # We need access to the product attrs we gathered. `product` var from Step 1 is local to try/finally block?
                # Ah, Python variables in try block leak to function scope? Yes, usually.
                # But `product` was defined inside `try`. If exception, we return.
                # If no exception, `product` is available but DB closed so relations fail. Attributes are fine.
                
                # Check if we preserved `product`? 
                # Step 1 `product` variable IS visible here.
                amazon_results = amazon_client.search_product_smart(product, domain=amazon_domain)
                print(f"[PricingService] Amazon returned {len(amazon_results)} raw results (Sonar Active).")
            else:
                print(f"[PricingService] Amazon Search Skipped (Cache Hit).")
                
        except Exception as e:
            print(f"[PricingService] Amazon Fetch Error: {e}")

        # --- STEP 3: WRITE RESULTS (Short DB Session) ---
        db = SessionLocal()
        try:
            # Re-fetch product to update prices (it might have changed, but unlikely)
            # We need to attach price updates to an active session object
            product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
            if not product: return # Deleted meanwhile?

            # Accumulators
            prices_box = []
            prices_manual = []
            prices_loose = []
            
            # Helper function (Locally defined to capture context)
            def process_and_filter(items, source, db_session):
                processed_ids = []
                check_term = ListingClassifier.clean_search_query(search_context['product_name'], "")
                
                # Logging counters
                skipped = {"region": 0, "relevance": 0, "console": 0}

                for item in items:
                    title = item.get('title', '')
                    
                    # 1. Classify
                    item_region = ListingClassifier.detect_region(title)
                    if not item_region:
                         # Contextual Fallback:
                         # If the item has no distinct region marker, assume it matches the region we are looking for.
                         # E.g. Searching for PAL on Amazon FR returns "Game X" (Unknown) -> Assume PAL.
                         item_region = target_console_region
                    
                    item_condition = ListingClassifier.detect_condition(title)
                    
                    # 2. Region Filter
                    if target_console_region and item_region:
                         if not ListingClassifier.is_region_compatible(item_region, target_console_region):
                             skipped['region'] += 1
                             continue
                             
                    # 3. Junk & Relevance
                    if ListingClassifier.is_junk(title, search_context['product_name'], search_context['console_name'], search_context['genre']):
                        continue
                        
                    if not ListingClassifier.is_relevant(title, check_term):
                        skipped['relevance'] += 1
                        continue
                     
                    # Console Relevance
                    c_terms = [t.lower() for t in search_context['console_name'].split() if len(t) > 2]
                    if c_terms:
                         if not any(ct in title.lower() for ct in c_terms):
                             skipped['console'] += 1
                             continue
                    
                    # 5. Extract Price
                    price_val = 0.0
                    currency = "USD"
                    external_id = None
                    url = None
                    img = None
                    
                    if source == 'eBay':
                         if 'price' in item:
                            price_val = float(item['price'].get('value', 0))
                            currency = item['price'].get('currency', 'USD')
                         external_id = item.get('itemId')
                         url = item.get('itemWebUrl')
                         if 'thumbnailImages' in item and item['thumbnailImages']:
                             img = item['thumbnailImages'][0]['imageUrl']
                    else: # Amazon
                         price_val = item.get('price', 0)
                         currency = item.get('currency', 'USD')
                         external_id = item.get('asin')
                         url = item.get('link')
                         img = item.get('image')

                    if not external_id: continue
                    processed_ids.append(external_id)

                    # Good Deal Logic (Using Context Pricing)
                    is_good_deal = False
                    p_manual = search_context.get('manual_only_price')
                    p_box = search_context.get('box_only_price')
                    p_loose = search_context.get('loose_price')
                    
                    if item_condition == 'MANUAL_ONLY' and p_manual and price_val > 0:
                        if price_val < (p_manual * 0.8): is_good_deal = True
                    elif item_condition == 'BOX_ONLY' and p_box and price_val > 0:
                         if price_val < (p_box * 0.8): is_good_deal = True
                    elif item_condition not in ['PARTS', 'BOX_ONLY', 'MANUAL_ONLY']:
                         if p_loose and price_val > 0:
                            if price_val < (p_loose * 0.7): is_good_deal = True
                    
                    # Collect Stats
                    if price_val > 0:
                        if item_condition == 'BOX_ONLY': prices_box.append(price_val)
                        elif item_condition == 'MANUAL_ONLY': prices_manual.append(price_val)
                        elif item_condition not in ['PARTS']: prices_loose.append(price_val)

                    # DB Update
                    existing = db_session.query(Listing).filter(
                        Listing.product_id == product_id,
                        Listing.source == source,
                        Listing.external_id == external_id
                    ).first()
                    
                    if existing:
                        existing.price = price_val
                        existing.title = title
                        existing.condition = item_condition
                        existing.is_good_deal = is_good_deal
                        existing.last_updated = datetime.utcnow()
                        existing.status = 'active'
                        if img: existing.image_url = img
                    else:
                        new_listing = Listing(
                            product_id=product_id,
                            source=source,
                            external_id=external_id,
                            title=title,
                            price=price_val,
                            currency=currency,
                            condition=item_condition,
                            url=url,
                            image_url=img,
                            seller_name=source if source=='Amazon' else 'eBay User',
                            status='active',
                            is_good_deal=is_good_deal,
                            last_updated=datetime.utcnow()
                        )
                        db_session.add(new_listing)
                
                print(f"[PricingService] {source} Filter Stats: Region={skipped['region']}, Relevance={skipped['relevance']}, Console={skipped['console']}. Kept: {len(processed_ids)}")
                return processed_ids

            # Process Both
            ebay_ids = process_and_filter(ebay_results, 'eBay', db)
            amazon_ids = process_and_filter(amazon_results, 'Amazon', db)
            
            # --- CLEANUP (Safety Net) ---
            if ebay_ids:
                db.query(Listing).filter(
                    Listing.product_id == product_id,
                    Listing.source == 'eBay',
                    Listing.status == 'active',
                    Listing.external_id.notin_(ebay_ids)
                ).delete(synchronize_session=False)

            if amazon_ids:
                db.query(Listing).filter(
                    Listing.product_id == product_id,
                    Listing.source == 'Amazon',
                    Listing.status == 'active',
                    Listing.external_id.notin_(amazon_ids)
                ).delete(synchronize_session=False)
            
            # Update Averages
            if prices_box: product.box_only_price = sum(prices_box) / len(prices_box)
            if prices_manual: product.manual_only_price = sum(prices_manual) / len(prices_manual)
                
            db.commit()
            print(f"[PricingService] Update Complete for {product_id}. Prices Updated.")
            
        except Exception as e:
            print(f"[PricingService] WRITE ERROR: {e}")
            db.rollback()
        finally:
            db.close()
