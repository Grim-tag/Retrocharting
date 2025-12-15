from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RetroCharting"
    API_V1_STR: str = "/api/v1"
    API_BASE_URL: str = "http://localhost:8000" 
    DATABASE_URL: str
    
    # Fix for Database Divergence: Force usage of root collector.db
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if "sqlite" in self.DATABASE_URL:
             import os
             import os
             # Portable Logic:
             # This file is in backend/app/core/
             # We want to go up 3 levels to reach ROOT (where collector.db is)
             base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
             # But wait, __file__ is inside the class or module? carefully
             # Ideally use the same logic as Config inner class but that's hard to access here.
             # Let's duplicate the reliable logic:
             current_file = os.path.abspath(__file__)
             backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_file))) # backend/
             root_dir = os.path.dirname(backend_dir) # collector/ (ROOT)
             
             db_path = os.path.join(root_dir, "collector.db")
             return f"sqlite:///{db_path}"
        
        # FIX: SQLAlchemy requires 'postgresql://', but Render often gives 'postgres://'
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
             return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
             
        return self.DATABASE_URL

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
        # Go up 3 levels: core -> app -> backend -> collector (ROOT)
        _project_root = os.path.dirname(os.path.dirname(os.path.dirname(_current_dir)))
        env_file = os.path.join(_project_root, ".env")
        # Fallback: check if .env is in backend/
        if not os.path.exists(env_file):
             env_file = os.path.join(os.path.dirname(_project_root), "backend", ".env")

        env_file_encoding = 'utf-8'

settings = Settings()
