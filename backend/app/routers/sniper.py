
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from app.services.vinted_client import vinted_client
from app.routers.auth import get_current_user 

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

class SniperResponse(BaseModel):
    success: bool
    items: List[SniperItem] = []
    error: Optional[str] = None
    debug: Optional[Dict[str, Any]] = None

@router.get("/search/vinted", response_model=SniperResponse)
def search_vinted(
    query: str, 
    limit: int = 20, 
    # current_user = Depends(get_current_user) 
):
    """
    Live search on Vinted. Always returns 200 OK with success flag.
    """
    if not query:
        return SniperResponse(success=False, error="Query is required")
        
    # Call client
    search_result = vinted_client.search(query, limit)
    raw_items = search_result.get("items", [])
    debug_info = search_result.get("debug", {})
    
    # Check for functional error
    if not raw_items and "error" in debug_info:
        return SniperResponse(
            success=False, 
            error=f"Vinted API Error: {debug_info.get('error')}", 
            debug=debug_info
        )

    results = []
    for item in raw_items:
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
            
    return SniperResponse(success=True, items=results, debug=debug_info)
