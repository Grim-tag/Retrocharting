from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.translation import Translation
from app.routers.admin import verify_admin_key
from typing import Dict, Any

router = APIRouter()

@router.get("/{locale}")
def get_translations(locale: str, db: Session = Depends(get_db)):
    """
    Get all translations for a specific locale.
    Used by the frontend to merge with static JSON.
    """
    translations = db.query(Translation).filter(Translation.locale == locale).all()
    # Convert list of rows to a nested dictionary or flat map? 
    # For simplicity, sending a flat map {key: value} is easiest for frontend to merge.
    result = {}
    for t in translations:
        result[t.key] = t.value
    return result

@router.post("/", dependencies=[Depends(verify_admin_key)])
def upsert_translation(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Upsert a translation.
    Payload: {"locale": "fr", "key": "home.title", "value": "Salut"}
    """
    locale = payload.get("locale")
    key = payload.get("key")
    value = payload.get("value")

    if not locale or not key or value is None:
        raise HTTPException(status_code=400, detail="Missing locale, key, or value")

    # Check if exists
    existing = db.query(Translation).filter(
        Translation.locale == locale,
        Translation.key == key
    ).first()

    if existing:
        existing.value = value
    else:
        new_trans = Translation(locale=locale, key=key, value=value)
        db.add(new_trans)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "success", "key": key, "locale": locale}
