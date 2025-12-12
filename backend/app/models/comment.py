from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship, backref
from app.db.session import Base
from datetime import datetime

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    
    # For nested replies (optional, can be null if top-level)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Moderation Status
    # status: 'pending', 'approved', 'rejected'. Default 'approved' for now as requested, or 'pending'? 
    # User said "pouvoir les approuvés", implies approval flow. 
    # Let's default to 'approved' for trusted users/start, but support the field.
    # Moderation Status: 'pending', 'approved', 'rejected'
    status = Column(String, default="pending", index=True)

    # Relationships
    user = relationship("User", back_populates="comments")
    product = relationship("Product", back_populates="comments")
    replies = relationship("Comment", backref=backref('parent', remote_side=[id]), cascade="all, delete-orphan")

# Need to update Product model to have 'comments' relationship
