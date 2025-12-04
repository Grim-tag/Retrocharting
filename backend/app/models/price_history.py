from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    date = Column(Date, index=True)
    price = Column(Float)
    condition = Column(String) # 'loose', 'cib', 'new', 'graded', 'box_only', 'manual_only'

    product = relationship("Product", back_populates="price_history")
