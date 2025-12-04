from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime

class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    source = Column(String, index=True) # e.g., 'eBay', 'Rakuten'
    external_id = Column(String, index=True) # Unique ID from the source
    title = Column(String)
    price = Column(Float)
    currency = Column(String)
    condition = Column(String)
    url = Column(String)
    image_url = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    status = Column(String, default="active") # 'active', 'ended'
    last_updated = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="listings")
