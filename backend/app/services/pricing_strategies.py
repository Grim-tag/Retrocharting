from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.product import Product
from app.models.listing import Listing
from app.services.listing_classifier import ListingClassifier
from app.services.ebay_client import ebay_client
from app.services.amazon_client import amazon_client

class PricingStrategy(ABC):
    """
    Base Strategy (The Mother).
    Contains shared tools for Database and API access.
    Does NOT contain business logic for filtering (left to children).
    """
    def __init__(self, db_session):
        self.db = db_session

    @abstractmethod
    def fetch_listings(self, product: Product) -> List[Dict]:
        """
        Orchestrates fetching from eBay/Amazon and updating the DB.
        Must be implemented by children to define specific search queries and filters.
        """
        pass

    def _save_listings(self, product: Product, listings: List[Dict], source: str):
        """
        Shared helper to save listings to DB.
        Common to all strategies.
        """
        processed_ids = []
        product_id = product.id

        # Accumulators for Price Calculation
        prices_box = []
        prices_manual = []
        prices_loose = []

        for item in listings:
            external_id = item.get('external_id')
            if not external_id: continue
            processed_ids.append(external_id)

            price_val = item.get('price', 0.0)
            condition = item.get('condition', 'LOOSE')
            
            # --- Stats Collection for Averages ---
            if price_val > 0:
                if condition == 'BOX_ONLY': prices_box.append(price_val)
                elif condition == 'MANUAL_ONLY': prices_manual.append(price_val)
                elif condition != 'PARTS': prices_loose.append(price_val)

            # --- DB Upsert ---
            existing = self.db.query(Listing).filter(
                Listing.product_id == product_id,
                Listing.source == source,
                Listing.external_id == external_id
            ).first()

            if existing:
                existing.price = price_val
                existing.title = item.get('title', '')
                existing.condition = condition
                existing.is_good_deal = item.get('is_good_deal', False)
                existing.last_updated = datetime.utcnow()
                existing.status = 'active'
                if item.get('image_url'): existing.image_url = item.get('image_url')
            else:
                new_listing = Listing(
                    product_id=product_id,
                    source=source,
                    external_id=external_id,
                    title=item.get('title', ''),
                    price=price_val,
                    currency=item.get('currency', 'USD'),
                    condition=condition,
                    url=item.get('url'),
                    image_url=item.get('image_url'),
                    seller_name=item.get('seller_name'),
                    status='active',
                    is_good_deal=item.get('is_good_deal', False),
                    last_updated=datetime.utcnow()
                )
                self.db.add(new_listing)
        
        # Cleanup old listings
        # Cleanup old listings
        cleanup_query = self.db.query(Listing).filter(
            Listing.product_id == product_id,
            Listing.source == source,
            Listing.status == 'active'
        )
        
        if processed_ids:
            cleanup_query = cleanup_query.filter(Listing.external_id.notin_(processed_ids))
            
        cleanup_query.delete(synchronize_session=False)

        # Commit is handled by caller or here? 
        # Ideally caller, but to be safe lets commit if we own the session? 
        # Note: In the service we pass session. Let's let the service commit.
        
        return prices_loose, prices_box, prices_manual

class GamesPricingStrategy(PricingStrategy):
    """
    Strategy specific for VIDEO GAMES.
    - Strict matching.
    - Prioritizes CIB/Loose.
    - Filters out 'Manuel Seul' or 'Boite Vide' unless searching for them? 
    - Actually, we collect them but Condition logic is standard.
    """
    def fetch_listings(self, product: Product) -> List[Dict]:
        # 1. Prepare SEARCH CONTEXT
        # Games specific: We want to match Title + Console
        query = ListingClassifier.clean_query(product.product_name, product.console_name)
        target_region = ListingClassifier.detect_region(product.console_name) or 'PAL' # Default to PAL if ambiguous for now
        
        # Marketplaces
        config = ListingClassifier.get_marketplaces(target_region) # amazon.fr, EBAY_FR
        category_id = "139973" # eBay Video Games Category
        
        print(f"[GamesStrategy] Searching '{query}' in {config['amazon_domain']} / {config['ebay_marketplace_id']}")
        
        # 2. Fetch eBay
        ebay_items = []
        try:
            raw_ebay = ebay_client.search_items(
                query, 
                limit=20, 
                category_ids=category_id, 
                marketplace_id=config['ebay_marketplace_id']
            )
            ebay_items = self._process_results(raw_ebay, 'eBay', product, target_region)
        except Exception as e:
            print(f"[GamesStrategy] eBay Error: {e}")

        # 3. Fetch Amazon
        amazon_items = []
        try:
            # We can use the existing smart search helper or adapt it.
            # Using client directly for transparency.
            # For now, let's allow the existing amazon client to do its magic but we filter the results.
            raw_amz = amazon_client.search_product_smart(product, domain=config['amazon_domain'])
            amazon_items = self._process_results(raw_amz, 'Amazon', product, target_region)
        except Exception as e:
            print(f"[GamesStrategy] Amazon Error: {e}")

        # 4. Save & Update Logic is handled by Service? 
        # No, Strategy fetch_listings should return the processed data or save it?
        # The abstract method says "fetch_listings", but the service usually orchestrates saving.
        # Let's handle SAVING inside the strategy to keep Service empty.
        
        loose_e, box_e, man_e = self._save_listings(product, ebay_items, 'eBay')
        loose_a, box_a, man_a = self._save_listings(product, amazon_items, 'Amazon')
        
        # Return something?
        return {"ebay": len(ebay_items), "amazon": len(amazon_items)}

    def _process_results(self, items: List[Any], source: str, product: Product, target_region: str) -> List[Dict]:
        """
        Internal filter logic SPECIFIC to Games.
        """
        valid_items = []
        check_term = ListingClassifier.clean_search_query(product.product_name, "")

        for item in items:
            # Normalized Item Dict
            normalized = self._normalize_item(item, source)
            title = normalized['title']

            # INDEPENDENT LOGIC: Games Filter
            # 1. Region Check
            item_region = ListingClassifier.detect_region(title) or target_region
            if not ListingClassifier.is_region_compatible(item_region, target_region):
                continue

            # 2. Junk Check (Protectors, etc)
            if ListingClassifier.is_junk(title, product.product_name, product.console_name, product.genre):
                continue
            
            # 3. Relevance
            if not ListingClassifier.is_relevant(title, check_term):
                continue

            # 4. Console Check (Must match system)
            # e.g. "Mario 64" on "DS" should not match "Nintendo 64"
            # (Simplified check)
            
            # 5. Deal Logic
            normalized['is_good_deal'] = self._is_good_deal(normalized['price'], normalized['condition'], product)
            
            valid_items.append(normalized)
            
        return valid_items

    def _normalize_item(self, item, source) -> Dict:
        # Transform eBay/Amazon raw dict to common format
        if source == 'eBay':
            price = float(item['price'].get('value', 0))
            return {
                'external_id': item.get('itemId'),
                'title': item.get('title'),
                'price': price,
                'currency': item['price'].get('currency', 'USD'),
                'condition': ListingClassifier.detect_condition(item.get('title', '')),
                'url': item.get('itemWebUrl'),
                'image_url': item.get('thumbnailImages', [{}])[0].get('imageUrl'),
                'seller_name': 'eBay User'
            }
        else: # Amazon
            return {
                'external_id': item.get('asin'),
                'title': item.get('title', ''),
                'price': item.get('price', 0),
                'currency': item.get('currency', 'USD'),
                'condition': 'LOOSE', # Amazon usually doesn't specify loose/cib cleanly in API
                'url': item.get('link'),
                'image_url': item.get('image'),
                'seller_name': 'Amazon'
            }

    def _is_good_deal(self, price, condition, product):
        # Strict Deal Logic for Games
        if condition == 'MANUAL_ONLY' and product.manual_only_price and price < product.manual_only_price * 0.8: return True
        if condition == 'BOX_ONLY' and product.box_only_price and price < product.box_only_price * 0.8: return True
        if condition == 'LOOSE' and product.loose_price and price < product.loose_price * 0.7: return True
        return False


class ConsolesPricingStrategy(GamesPricingStrategy):
    """
    Strategy specific for CONSOLES (Hardware).
    Inherits from GamesStrategy structure but overrides queries and filters.
    """
    def fetch_listings(self, product: Product) -> List[Dict]:
        # 1. Modify Query: Add "Console" explicitly if not present
        base_query = ListingClassifier.clean_query(product.product_name, "")
        if "console" not in base_query.lower() and "system" not in base_query.lower():
            query = f"{base_query} Console"
        else:
            query = base_query
            
        target_region = ListingClassifier.detect_region(product.product_name) or 'PAL' # Consoles often have region in name
        
        config = ListingClassifier.get_marketplaces(target_region) 
        category_id = "139971" # eBay Consoles Category
        
        print(f"[ConsolesStrategy] Searching '{query}' in {config['amazon_domain']} / {config['ebay_marketplace_id']}")
        
        # ... logic similar to Games but utilizing different category_id and query ...
        # For brevity reusing parent flow but with modified query/cat.
        # We need to Duplicate logic or Refactor Parent to accept params? 
        # Filiation: Parent handles flow, Child provides Params? 
        # Let's keep it simple: Copy-Paste-Modify or Helper.
        # I'll create a helper in Parent called `_execute_search`.
        
        # Reuse _process_results from parent (it uses detect_condition which we might want to override later)
        
        # 2. Fetch eBay
        ebay_items = []
        try:
            raw_ebay = ebay_client.search_items(
                query, 
                limit=20, 
                category_ids=category_id, 
                marketplace_id=config['ebay_marketplace_id']
            )
            ebay_items = self._process_results(raw_ebay, 'eBay', product, target_region)
        except Exception as e:
            print(f"[ConsolesStrategy] eBay Error: {e}")

        # 3. Amazon
        amazon_items = []
        try:
            # Smart search uses ASIN or Product Name
            raw_amz = amazon_client.search_product_smart(product, domain=config['amazon_domain'])
            # STRICT FILTERING (Uses _process_results defined below)
            amazon_items = self._process_results(raw_amz, 'Amazon', product, target_region)
        except Exception as e:
            print(f"[ConsolesStrategy] Amazon Error: {e}")

        loose_e, box_e, man_e = self._save_listings(product, ebay_items, 'eBay')
        loose_a, box_a, man_a = self._save_listings(product, amazon_items, 'Amazon')
        
        return {"ebay": len(ebay_items), "amazon": len(amazon_items)}

    def _process_results(self, items: List[Any], source: str, product: Product, target_region: str) -> List[Dict]:
        """
        STRICT Filtering for Consoles.
        Eliminates accessories, games, and junk.
        """
        valid_items = []
        check_term = ListingClassifier.clean_search_query(product.product_name, "")
        
        # Keywords that indicate an accessory or game, definitely NOT a console console
        # Note: We must be careful with "Game" (Game Boy) or "Box" (Box Only is a valid 'Condition' for separate tab)
        forbidden_terms = [
            'manette', 'controller', 'remote', 'gamepad', 'joystick', 
            'cable', 'câble', 'hdmi', 'adapter', 'adaptateur', 'supply', 'alim',
            'stand', 'support', 'fan', 'ventilateur', 'skin', 'sticker', 'case', 'sacoche',
            'replacement', 'remplacement', 'repair', 'reparation', 'parts', 'pièces', 'hs', 'broken',
            'jeu', 'jeux', 'game cartridge', 'cartridge', 'disc', 'cd', 'dvd'
        ]

        for item in items:
            normalized = self._normalize_item(item, source)
            title = normalized['title']
            title_lower = title.lower()

            # 1. Region Check
            item_region = ListingClassifier.detect_region(title) or target_region
            if not ListingClassifier.is_region_compatible(item_region, target_region):
                continue
                
            # 2. Strict Negative Keywords
            is_forbidden = False
            for term in forbidden_terms:
                if term in title_lower:
                    is_forbidden = True
                    break
            
            # Special check for "Game" standalone (avoid banning "Game Boy")
            # If title has "game" but product name doesn't have "game"? 
            # Or if title has "video game"
            if "video game" in title_lower or "jeu video" in title_lower:
                is_forbidden = True

            if is_forbidden:
                continue

            # 3. Junk Check
            if ListingClassifier.is_junk(title, product.product_name, product.console_name, product.genre):
                continue

            # 4. Relevance (Must contain product name parts)
            if not ListingClassifier.is_relevant(title, check_term):
                continue

            # 5. Price Sanity Check (Consoles are rarely $10 unless broken/accessory)
            # If price is very low compared to loose price, suspect accessory
            if product.loose_price and normalized['price'] < product.loose_price * 0.2:
                 # Ensure it's not a "Box Only" or "Manual" which can be cheap?
                 if normalized['condition'] not in ['BOX_ONLY', 'MANUAL_ONLY']:
                     continue

            normalized['is_good_deal'] = self._is_good_deal(normalized['price'], normalized['condition'], product)
            valid_items.append(normalized)

        return valid_items
    def _is_good_deal(self, price, condition, product):
        # Loose console deals are rare, usually looking for bundles.
        # Less aggressive discount threshold for consoles?
        if product.loose_price and price < product.loose_price * 0.85: return True
        return False


class AccessoriesPricingStrategy(GamesPricingStrategy):
    """
    Strategy for ACCESSORIES (Controllers, Cables).
    """
    def fetch_listings(self, product: Product) -> List[Dict]:
        query = ListingClassifier.clean_query(product.product_name, product.console_name)
        target_region = ListingClassifier.detect_region(product.console_name) or 'PAL'
        config = ListingClassifier.get_marketplaces(target_region) 
        category_id = "54968" # Accessories
        
        print(f"[AccessoriesStrategy] Searching '{query}'")
        
        ebay_items = []
        try:
            raw_ebay = ebay_client.search_items(
                query, 
                limit=20, 
                category_ids=category_id, 
                marketplace_id=config['ebay_marketplace_id']
            )
            ebay_items = self._process_results(raw_ebay, 'eBay', product, target_region)
        except Exception as e:
            print(f"[AccessoriesStrategy] eBay Error: {e}")

        self._save_listings(product, ebay_items, 'eBay')
        return {"ebay": len(ebay_items)}


class StrategyFactory:
    @staticmethod
    def get_strategy(product: Product, db_session) -> PricingStrategy:
        if product.genre == 'Systems':
            return ConsolesPricingStrategy(db_session)
        elif product.genre in ['Accessories', 'Controllers']:
            return AccessoriesPricingStrategy(db_session)
        else:
            return GamesPricingStrategy(db_session)
