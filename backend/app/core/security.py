from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from app.core.config import settings

# If settings.SECRET_KEY is specifically for JWT, use it. 
# Assuming existing config might just have SECRET_KEY.
SECRET_KEY = settings.SECRET_KEY if hasattr(settings, "SECRET_KEY") else "YOUR_FALLBACK_SECRET_KEY_CHANGE_IN_PROD"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 Days

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
