import sys
import os
from dotenv import load_dotenv

# Add backend directory to path to import app
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_path)

# Load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(env_path)

import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Configure Cloudinary
cloudinary.config( 
  cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
  api_key = settings.CLOUDINARY_API_KEY, 
  api_secret = settings.CLOUDINARY_API_SECRET 
)

def test_upload():
    print("Testing Cloudinary upload...")
    # Use a dummy image or a known URL
    url = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
    
    try:
        result = cloudinary.uploader.upload(url, folder="retrocharting/test")
        print(f"Upload successful!")
        print(f"Secure URL: {result['secure_url']}")
    except Exception as e:
        print(f"Upload failed: {e}")

if __name__ == "__main__":
    test_upload()
