import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from unittest.mock import MagicMock
from app.workers.amazon_worker import AmazonWorker
from app.models import Product, Listing

class TestAmazonWorkerRegionSafety(unittest.TestCase):
    def test_worker_rejects_incorrect_domain(self):
        """
        Verify that an NTSC worker strictly rejects an amazon.fr result.
        """
        # 1. Setup NTSC Worker (Only allows .com, .ca)
        worker = AmazonWorker(region_type="NTSC")
        
        # 2. Mock DB and Product
        db = MagicMock()
        product = Product(id=1, product_name="Test Game", console_name="Nintendo 64") # NTSC Console
        
        # 3. Simulate a result from Amazon.FR (Invalid for NTSC worker)
        bad_result = {
            'title': "Test Game",
            'price': 50.0,
            'currency': 'EUR',
            'url': 'https://www.amazon.fr/dp/B000000',
            'seller_name': 'Amazon (amazon.fr)',
            'asin': 'B000000'
        }
        
        # 4. Attempt to save
        worker._save_listing(db, product.id, bad_result)
        
        # 5. Assert NO add to DB occurred
        db.add.assert_not_called()
        print("\n✅ Verification Passed: NTSC Worker rejected amazon.fr listing.")

    def test_worker_rejects_incorrect_region_product(self):
        """
        Verify that an NTSC worker refuses to process a PAL product.
        """
        worker = AmazonWorker(region_type="NTSC")
        db = MagicMock()
        
        # PAL Product
        pal_product = Product(id=2, product_name="Test Game (PAL)", console_name="Super Nintendo")
        
        # Use a mock scraper to ensure we don't hit network
        worker.scraper = MagicMock()
        
        # Attempt process
        worker._process_product(db, pal_product, "amazon.com")
        
        # Assert Scraper was NOT called
        worker.scraper.search_product.assert_not_called()
        print("\n✅ Verification Passed: NTSC Worker refused PAL product.")

if __name__ == '__main__':
    unittest.main()
