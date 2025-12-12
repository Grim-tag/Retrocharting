from sqlalchemy import Column, Integer, String, Float, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    pricecharting_id = Column(Integer, unique=True, index=True)
    console_name = Column(String, index=True)
    product_name = Column(String, index=True)
    loose_price = Column(Float)
    cib_price = Column(Float)
    new_price = Column(Float)
    box_only_price = Column(Float, nullable=True) # New: Price for Box Only
    manual_only_price = Column(Float, nullable=True) # New: Price for Manual Only
    genre = Column(String, nullable=True)
    release_date = Column(Date, nullable=True)
    image_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    last_scraped = Column(DateTime, nullable=True)

    publisher = Column(String, nullable=True)
    developer = Column(String, nullable=True)
    esrb_rating = Column(String, nullable=True)
    # ean = Column(String, nullable=True)
    # gtin = Column(String, nullable=True)
    players = Column(String, nullable=True)

    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")
    listings = relationship("Listing", back_populates="product", cascade="all, delete-orphan")
    sales_transactions = relationship("SalesTransaction", back_populates="product", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="product", cascade="all, delete-orphan")
