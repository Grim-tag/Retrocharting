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
        env_file = ".env"

settings = Settings()
