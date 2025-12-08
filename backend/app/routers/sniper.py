
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.services.vinted_client import vinted_client
from app.core.security import get_current_user # Optional: Protect this route?

router = APIRouter()

class SniperItem(BaseModel):
    id: int
    title: str
    price: float
    currency: str
    url: str
    image_url: Optional[str] = None
    source: str = "Vinted"
    created_at_ts: Optional[str] = None

@router.get("/search/vinted", response_model=List[SniperItem])
def search_vinted(
    query: str, 
    limit: int = 20, 
    # current_user = Depends(get_current_user) # Uncomment to protect
):
    """
    Live search on Vinted.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
        
    raw_items = vinted_client.search(query, limit)
    
    results = []
    for item in raw_items:
        # Map Vinted JSON to our Schema
        try:
            price_amount = float(item.get('price', {}).get('amount', 0))
            currency_code = item.get('price', {}).get('currency_code', 'EUR')
            photo_url = item.get('photo', {}).get('url')
            
            results.append(SniperItem(
                id=item['id'],
                title=item['title'],
                price=price_amount,
                currency=currency_code,
                url=item['url'],
                image_url=photo_url,
                source="Vinted",
                created_at_ts=str(item.get('created_at_ts', ''))
            ))
        except Exception as e:
            print(f"Error parsing item {item.get('id')}: {e}")
            continue
            
    return results
