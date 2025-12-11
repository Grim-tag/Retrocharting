from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.routers.auth import get_current_user
import csv
import io
from datetime import datetime

router = APIRouter()

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
