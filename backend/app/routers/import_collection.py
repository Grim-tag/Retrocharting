from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.routers.auth import get_current_user
import csv
import io
from app.models.product import Product
from thefuzz import process, fuzz

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.collection_item import CollectionItem

router = APIRouter()

class ImportItem(BaseModel):
    product_id: int
    condition: str
    paid_price: Optional[float] = None
    currency: Optional[str] = "EUR"
    purchase_date: Optional[str] = None # YYYY-MM-DD
    comment: Optional[str] = None

class BulkImportRequest(BaseModel):
    items: List[ImportItem]

@router.post("/confirm")
async def confirm_import(
    request: BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Finalizes the import by creating collection items for the provided list.
    """
    imported_count = 0
    errors = 0
    
    for item in request.items:
        try:
            # Parse date if present
            p_date = None
            if item.purchase_date:
                try:
                    # Generic parser or flexible format could be better, but strict YYYY-MM-DD is fine for template
                    p_date = datetime.strptime(item.purchase_date, "%Y-%m-%d")
                except ValueError:
                    pass # Ignore invalid date
            
            new_item = CollectionItem(
                user_id=current_user.id,
                product_id=item.product_id,
                condition=item.condition,
                paid_price=item.paid_price,
                purchase_date=p_date,
                notes=item.comment
            )
            db.add(new_item)
            imported_count += 1
        except Exception as e:
            # simple logging
            print(f"Error importing item {item}: {e}")
            errors += 1
            
    db.commit()
    return {"message": "Import processed", "imported": imported_count, "errors": errors}

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a CSV file, parses it, and attempts to match items to the database.
    Returns a JSON summary of matches for user review.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")

    content = await file.read()
    try:
        # Decode content
        decoded_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        # Validate Headers
        headers = csv_reader.fieldnames
        if not headers or "Title" not in headers:
             raise HTTPException(status_code=400, detail="Invalid CSV format. 'Title' column is required.")
        
        rows = list(csv_reader)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")

    results = {
        "matches": [],      # High confidence matches (>= 90%)
        "ambiguous": [],    # Potentially correct (70-89%)
        "unmatched": []     # No good match found (< 70%)
    }

    # Cache products by console to minimize DB hits
    # Structure: { "Nintendo 64": [ {id, name, ...}, ... ], ... }
    console_cache = {}

    for row_idx, row in enumerate(rows):
        title = row.get("Title", "").strip()
        platform = row.get("Platform", "").strip()
        
        if not title:
            continue

        item_data = {
            "csv_index": row_idx,
            "title": title,
            "platform": platform,
            "condition": row.get("Condition", "LOOSE"),
            "paid_price": row.get("Paid Price"),
            "currency": row.get("Currency", "EUR"),
            "purchase_date": row.get("Purchase Date"),
            "comment": row.get("Comment")
        }

        # 1. Exact Match Attempt (Fastest)
        exact_query = db.query(Product).filter(Product.product_name == title)
        if platform:
            exact_query = exact_query.filter(Product.console_name == platform)
        
        exact_match = exact_query.first()
        
        if exact_match:
            results["matches"].append({
                "item": item_data,
                "match": {
                    "id": exact_match.id,
                    "product_name": exact_match.product_name,
                    "console_name": exact_match.console_name,
                    "image_url": exact_match.image_url,
                    "score": 100
                }
            })
            continue

        # 2. Fuzzy Match
        # Load cache for this platform if needed
        # If platform is missing, we might need to search EVERYTHING (expensive), 
        # for now let's assume platform is key or we search common consoles?
        # To be safe, if platform is missing, we skip fuzzy match or search all? 
        # Let's enforce Platform for fuzzy matching for performance in V1.
        
        candidates = []
        if platform:
            if platform not in console_cache:
                # Fetch all products for this console
                # We normalize console name for DB query? 
                # For now, simplistic DB query. In real world, "N64" vs "Nintendo 64" needs mapping.
                # Assuming user uses our template which should have correct names.
                # We can also do a fuzzy match on Console Name if we wanted.
                
                prods = db.query(Product.id, Product.product_name, Product.console_name, Product.image_url)\
                    .filter(Product.console_name.ilike(f"%{platform}%"))\
                    .all()
                console_cache[platform] = [{"id": p.id, "name": p.product_name, "console": p.console_name, "image": p.image_url} for p in prods]
            
            candidates = console_cache[platform]
        
        if not candidates:
            # If no platform or platform yielded no products, mark unmatched
            results["unmatched"].append({
                "item": item_data,
                "reason": "Console not found or empty"
            })
            continue

        # Extract best match from candidates
        # process.extractOne returns (match, score, index) 
        # but here candidates is a list of dicts, so we need to pass a list of strings (names)
        candidate_names = [c["name"] for c in candidates]
        best_match = process.extractOne(title, candidate_names, scorer=fuzz.token_sort_ratio)
        
        if best_match:
            match_name, score, match_idx = best_match
            matched_product = candidates[match_idx]
            
            match_obj = {
                "id": matched_product["id"],
                "product_name": matched_product["name"],
                "console_name": matched_product["console"],
                "image_url": matched_product["image"],
                "score": score
            }

            if score >= 90:
                results["matches"].append({"item": item_data, "match": match_obj})
            elif score >= 60:
                results["ambiguous"].append({"item": item_data, "match": match_obj})
            else:
                results["unmatched"].append({"item": item_data, "best_guess": match_obj, "reason": "Low score"})
        else:
             results["unmatched"].append({"item": item_data, "reason": "No match found"})

    return results

# CSV Template Headers
TEMPLATE_HEADERS = [
    "Title",          # Game Name (Required)
    "Platform",       # Console Name (Required, e.g. "Nintendo 64")
    "Condition",      # LOOSE, CIB, NEW, GRADED (Optional, default LOOSE)
    "Paid Price",     # 10.50 (Optional)
    "Currency",       # EUR, USD (Optional, default EUR)
    "Purchase Date",  # YYYY-MM-DD (Optional)
    "Comment"         # Personal notes (Optional)
]

@router.get("/template")
def get_import_template():
    """
    Generates and returns a CSV template for bulk collection import.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Headers
    writer.writerow(TEMPLATE_HEADERS)
    
    # Write Example Row
    writer.writerow([
        "Super Mario 64", 
        "Nintendo 64", 
        "LOOSE", 
        "15.00", 
        "EUR", 
        "2023-12-25", 
        "Cartridge only, good label"
    ])
    
    output.seek(0)
    
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=retrocharting_import_template.csv"
    
    return response
