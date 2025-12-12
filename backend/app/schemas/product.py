from pydantic import BaseModel
from typing import Optional
from datetime import date

class ProductBase(BaseModel):
    pricecharting_id: Optional[int] = None
    console_name: Optional[str] = None
    product_name: Optional[str] = None
    loose_price: Optional[float] = None
    cib_price: Optional[float] = None
    new_price: Optional[float] = None
    box_only_price: Optional[float] = None
    manual_only_price: Optional[float] = None
    genre: Optional[str] = None
    release_date: Optional[date] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    publisher: Optional[str] = None
    developer: Optional[str] = None
    esrb_rating: Optional[str] = None
    esrb_rating: Optional[str] = None
    players: Optional[str] = None
    sales_count: Optional[int] = 0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True
