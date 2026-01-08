import os
import sys
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Load env variables
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

print(f"Cloud Name: {cloud_name}")
print(f"API Key: {api_key}")
print(f"API Secret: {'*' * len(api_secret) if api_secret else 'None'}")

if not all([cloud_name, api_key, api_secret]):
    print("Missing credentials!")
    sys.exit(1)

cloudinary.config( 
  cloud_name = cloud_name, 
  api_key = api_key, 
  api_secret = api_secret 
)

test_image_url = "https://upload.wikimedia.org/wikipedia/commons/e/e0/SNES-Mod1-Console-Set.jpg" # Valid Wiki Image
print(f"Attempting to upload: {test_image_url}")

try:
    res = cloudinary.uploader.upload(test_image_url, folder="retrocharting/test_upload")
    print("\nSUCCESS!")
    print(f"Secure URL: {res['secure_url']}")
except Exception as e:
    print(f"\nFAILED: {e}")
