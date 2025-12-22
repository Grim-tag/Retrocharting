
import sys
import os
from unittest.mock import MagicMock

# 1. Setup Environment Variables Mock
os.environ["DATABASE_URL"] = "sqlite:///collector.db"
os.environ["PYTHON_VERSION"] = "3.10.0"
os.environ["PRICECHARTING_API_TOKEN"] = "mock_token"
os.environ["SERPAPI_KEY"] = "mock_key"
os.environ["CLOUDINARY_CLOUD_NAME"] = "mock_cloud"
os.environ["CLOUDINARY_API_KEY"] = "mock_key"
os.environ["CLOUDINARY_API_SECRET"] = "mock_secret"
os.environ["EBAY_CLIENT_ID"] = "mock_ebay"
os.environ["EBAY_CLIENT_SECRET"] = "mock_secret"
os.environ["EBAY_USER_TOKEN"] = "mock_token"
os.environ["GOOGLE_CLIENT_ID"] = "mock_google"
os.environ["GOOGLE_CLIENT_SECRET"] = "mock_secret"
os.environ["GOOGLE_CALLBACK_URL"] = "http://localhost"

# 2. Add backend to sys.path (Simulate Render "rootDir: backend")
current_dir = os.path.dirname(os.path.abspath(__file__)) # root
backend_dir = os.path.join(current_dir, 'backend')
sys.path.append(backend_dir) 

print(f"Testing with sys.path: {sys.path}")

try:
    # 3. Try Importing App Modules
    import app.models # Trigger init
    from app.workers.amazon_worker import AmazonWorker
    
    print("✅ Successfully imported AmazonWorker")
    
    # 4. Try Initialization
    worker = AmazonWorker("PAL")
    print("✅ Successfully initialized AmazonWorker")
    
    # 5. Check dependencies
    from app.core.config import settings
    print(f"✅ Settings Loaded. DB URL: {settings.DATABASE_URL}")

except ImportError as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Startup Error: {e}")
    sys.exit(1)
