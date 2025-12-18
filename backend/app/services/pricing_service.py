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
        REFACTORED V3: Uses Strategy Pattern (Strict Filiation).
        """
        print(f"[PricingService] Starting update for Product {product_id}")
        
        db = SessionLocal()
        try:
            product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
            if not product:
                print(f"[PricingService] Product {product_id} not found.")
                return

            # [NEW] Strategy Pattern Delegation
            # The 'Brain' decides which specialist to hire based on the product genre.
            from app.services.pricing_strategies import StrategyFactory
            
            # Instantiate the specialist (Soldier)
            strategy = StrategyFactory.get_strategy(product, db)
            
            # Give orders (Execute Search & Save)
            # The strategy handles all API calls, filtering, and DB updates internally.
            strategy.fetch_listings(product)

            # We commit here to finalize the transaction managed by the strategy
            db.commit()
            print(f"[PricingService] Update Complete for {product_id}.")
            
        except Exception as e:
            print(f"[PricingService] Critical Error: {e}")
            db.rollback()
        finally:
            db.close()
