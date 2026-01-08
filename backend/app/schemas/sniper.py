from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SniperResultBase(BaseModel):
    title: str
    price: float
    currency: str = "EUR"
    url: str
    image_url: Optional[str] = None
    external_id: str
    is_potential_deal: bool = False
    market_price_snapshot: Optional[float] = None
    detected_at: Optional[datetime] = None

class SniperResultOut(SniperResultBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class SniperWatchCreate(BaseModel):
    query_text: str
    frequency: int = 15

class SniperWatchOut(BaseModel):
    id: int
    query_text: str # From joined SniperQuery
    is_active: bool
    created_at: datetime
    # We might want to include latest results or counts here
    
    class Config:
        orm_mode = True
