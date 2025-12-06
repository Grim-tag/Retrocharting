from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import GoogleAuthRequest, Token, UserResponse, TokenData
from app.core.security import create_access_token, verify_token
from app.core.config import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from typing import Optional

router = APIRouter()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID if hasattr(settings, "GOOGLE_CLIENT_ID") else None

if not GOOGLE_CLIENT_ID:
    # Try getting from env directly if config object not updated
    import os
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@router.post("/google", response_model=Token)
def login_with_google(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Server config error: Missing GOOGLE_CLIENT_ID")

    try:
        # Verify Token with Google
        id_info = id_token.verify_oauth2_token(request.credential, requests.Request(), GOOGLE_CLIENT_ID)
        
        # Check issuer
        if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        # Extract info
        google_id = id_info['sub']
        email = id_info['email']
        name = id_info.get('name')
        picture = id_info.get('picture')

    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google Token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user exists
    user = db.query(User).filter(User.google_id == google_id).first()
    
    if not user:
        # Check if email exists (maybe from future legacy login?)
        # For now, simplistic: Create new user
        user = User(
            email=email,
            google_id=google_id,
            full_name=name,
            avatar_url=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update info if changed (e.g. avatar)
        if user.avatar_url != picture or user.full_name != name:
            user.avatar_url = picture
            user.full_name = name
            db.commit()
            
    # Create internal JWT
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi import Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

from app.schemas.user import UserUpdate

@router.put("/me", response_model=UserResponse)
def update_user_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_update.username:
        # Check uniqueness
        if user_update.username != current_user.username:
            existing = db.query(User).filter(User.username == user_update.username).first()
            if existing:
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = user_update.username
            
    if user_update.full_name:
        current_user.full_name = user_update.full_name
    
    if user_update.avatar_url:
        current_user.avatar_url = user_update.avatar_url
        
    db.commit()
    db.refresh(current_user)
    return current_user
