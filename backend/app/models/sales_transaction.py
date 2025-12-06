from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime

class SalesTransaction(Base):
    """
    Stores raw sales data from external sources (mainly eBay 'Sold' listings).
    Used to calculate proprietary market values independent of PriceCharting.
    
    This is the 'Raw Data' layer. The 'Valuation' layer will be calculated from this.
    """
    __tablename__ = "sales_transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to our internal Product (The "Golden Record")
    product_id = Column(Integer, ForeignKey("products.id"), index=True, nullable=False)
    
    # External Source Info
    source = Column(String, default="eBay") # eBay, Vinted, Leboncoin...
    marketplace = Column(String, index=True) # EBAY_FR, EBAY_US, EBAY_UK, EBAY_DE...
    external_id = Column(String, unique=True, index=True) # eBay Item ID
    
    # Transaction Details
    title = Column(String, index=True) # Raw title for analysis
    price = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    date = Column(DateTime, index=True, default=datetime.utcnow) # Actual sale date
    
    # Raw Data for future improvements
    # We store the full JSON response or pertinent fields to re-run classification later if algorithms improve
    url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    
    # Computed / Classified Fields (Populated by our Algorithm)
    condition_grade = Column(String, nullable=True, index=True) # LOOSE, CIB, NEW, GRADED
    is_outlier = Column(Integer, default=0) # 1 if price is absurdly low/high and excluded from algos

    # Relationships
    product = relationship("Product", back_populates="sales_transactions")
