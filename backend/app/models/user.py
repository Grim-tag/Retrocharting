from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String)
    avatar_url = Column(String)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Gamification
    rank = Column(String, default="Loose")
    xp = Column(Integer, default=0)
    last_active = Column(DateTime, default=datetime.utcnow)

    # Relationships
    collection_items = relationship("CollectionItem", back_populates="user")
    sniper_watches = relationship("SniperWatch", back_populates="user")
