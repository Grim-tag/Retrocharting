from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class SniperQuery(Base):
    __tablename__ = "sniper_queries"

    id = Column(Integer, primary_key=True, index=True)
    query_text = Column(String, unique=True, index=True, nullable=False)
    last_scraped_at = Column(DateTime, nullable=True)
    frequency = Column(Integer, default=15) # Minutes

    watches = relationship("SniperWatch", back_populates="query", cascade="all, delete-orphan")
    results = relationship("SniperResult", back_populates="query", cascade="all, delete-orphan")

class SniperWatch(Base):
    __tablename__ = "sniper_watches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    query_id = Column(Integer, ForeignKey("sniper_queries.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Prevent duplicate watches for same user/query match
    __table_args__ = (UniqueConstraint('user_id', 'query_id', name='_user_query_uc'),)

    user = relationship("User", back_populates="sniper_watches")
    query = relationship("SniperQuery", back_populates="watches")

class SniperResult(Base):
    __tablename__ = "sniper_results"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("sniper_queries.id"), nullable=False)
    external_id = Column(String, index=True) # Vinted Item ID
    title = Column(String)
    price = Column(Float)
    currency = Column(String, default="EUR")
    url = Column(String)
    image_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow) # When scraped
    detected_at = Column(DateTime, nullable=True) # When item was posted on platform
    
    # Deal Detection
    is_potential_deal = Column(Boolean, default=False)
    market_price_snapshot = Column(Float, nullable=True) # Price of game at moment of scrape
    
    query = relationship("SniperQuery", back_populates="results")
