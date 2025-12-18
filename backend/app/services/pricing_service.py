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
        REFACTORED V4: Decoupled DB/Network to prevent SQLite Locking.
        """
        print(f"[PricingService] Starting update for Product {product_id}")
        
        # 1. READ PRODUCT (Short Transaction)
        db = SessionLocal()
        strategy = None
        product_copy = None
        
        try:
            product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
            if not product:
                print(f"[PricingService] Product {product_id} not found.")
                return
            
            # Detach/Expunge for use after session close
            db.expunge(product)
            product_copy = product # Reference to detached object
            
            from app.services.pricing_strategies import StrategyFactory
            # Instantiate Strategy (No DB usage here)
            strategy = StrategyFactory.get_strategy(product)
            
        except Exception as e:
             print(f"[PricingService] Read Error: {e}")
             return
        finally:
            db.close() # Release DB Lock immediately

        # 2. NETWORK FETCH (Long Duration - No DB Lock)
        # This takes 5-10 seconds. The DB is FREE during this time.
        try:
            # Pass detached product object
            listings = strategy.fetch_listings_data(product_copy)
        except Exception as e:
            print(f"[PricingService] Network Error: {e}")
            # If network fails, we just don't save anything.
            return

        # 3. WRITE RESULTS (Short Transaction)
        db = SessionLocal()
        try:
            # Save the gathered data
            strategy.save_listings(db, product_id, listings)
            db.commit()
            print(f"[PricingService] Update Complete for {product_id}.")
            
        except Exception as e:
            print(f"[PricingService] Write Error: {e}")
            db.rollback()
        finally:
            db.close()
