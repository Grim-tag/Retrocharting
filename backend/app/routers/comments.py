from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.comment import Comment
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.admin import get_admin_access
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import re

router = APIRouter()

# --- Schemas ---
class CommentCreate(BaseModel):
    product_id: int
    content: str
    parent_id: Optional[int] = None

class CommentResponse(BaseModel):
    id: int
    user_id: int
    username: str
    content: str
    created_at: datetime
    parent_id: Optional[int]
    # For now, we flatten replies logic or handle in frontend. 
    # Let's keep it simple: return flat list and frontend nests them.

    class Config:
        orm_mode = True

class CommentAdminUpdate(BaseModel):
    is_approved: bool

# --- Helper ---
def contains_link(text: str) -> bool:
    # Basic regex for url detection
    regex = r"(https?://|www\.|[a-zA-Z0-9-]+\.(com|net|org|fr|de|io|co))"
    return re.search(regex, text, re.IGNORECASE) is not None

# --- Endpoints ---

@router.post("/", response_model=CommentResponse)
def create_comment(
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment. Reject links.
    """
    if contains_link(comment.content):
        raise HTTPException(status_code=400, detail="Links are not allowed in comments.")
    
    if len(comment.content) > 1000:
        raise HTTPException(status_code=400, detail="Comment too long (max 1000 chars).")

    new_comment = Comment(
        user_id=current_user.id,
        product_id=comment.product_id,
        content=comment.content,
        parent_id=comment.parent_id,
        is_approved=True # Auto-approve for now, unless flagged later
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    # Return with username
    return {
        "id": new_comment.id,
        "user_id": new_comment.user_id,
        "username": current_user.username,
        "content": new_comment.content,
        "created_at": new_comment.created_at,
        "parent_id": new_comment.parent_id
    }

@router.get("/product/{product_id}")
def get_product_comments(
    product_id: int,
    limit: int = 5,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get comments for a product (Approved only).
    Sorted by Newest First? Or Oldest First? 
    Usually Oldest First for discussions, or Newest for reviews. 
    Let's go Newest First for now as it's easier to see activity.
    """
    query = db.query(Comment).filter(
        Comment.product_id == product_id, 
        Comment.is_approved == True
    ).order_by(Comment.created_at.desc())
    
    total = query.count()
    comments = query.limit(limit).offset(offset).all()
    
    result = []
    for c in comments:
        result.append({
            "id": c.id,
            "user_id": c.user_id,
            "username": c.user.username if c.user else "Unknown",
            "content": c.content,
            "created_at": c.created_at,
            "parent_id": c.parent_id
        })
        
    return {"total": total, "comments": result}

# --- Admin Endpoints ---

@router.get("/admin/pending", dependencies=[Depends(get_admin_access)])
def get_pending_comments(db: Session = Depends(get_db)):
    """Get comments waiting for approval"""
    comments = db.query(Comment).filter(Comment.is_approved == False).all()
    # Map result...
    return comments

@router.delete("/{comment_id}", dependencies=[Depends(get_admin_access)])
def delete_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
    
@router.patch("/{comment_id}/approve", dependencies=[Depends(get_admin_access)])
def approve_comment(comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.is_approved = True
    db.commit()
    return {"message": "Comment approved"}
