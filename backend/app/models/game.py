from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    
    # Core Identity (Shared across all regional variants)
    console_name = Column(String, index=True) # "Nintendo 64"
    title = Column(String, index=True)        # "Super Mario 64"
    slug = Column(String, unique=True, index=True) # "nintendo-64-super-mario-64"
    
    description = Column(Text, nullable=True)
    
    genre = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    release_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    # One Game -> Many Products (Variants)
    products = relationship("Product", back_populates="game")
