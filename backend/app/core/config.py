from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RetroCharting"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str
    PRICECHARTING_API_TOKEN: str
    
    # eBay API
    EBAY_CLIENT_ID: str
    EBAY_CLIENT_SECRET: str
    EBAY_USER_TOKEN: str
    
    # SerpApi
    SERPAPI_KEY: str
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_CALLBACK_URL: str

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    class Config:
        import os
        # Calculate absolute path to .env (project root)
        # config.py is in backend/app/core/
        _current_dir = os.path.dirname(os.path.abspath(__file__))
        _project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_current_dir))))
        env_file = os.path.join(_project_root, ".env")
        env_file_encoding = 'utf-8'

settings = Settings()
