from app.db.session import SessionLocal
from app.services.consolidation import run_consolidation
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO)

print("Starting Emergency Fusion...")
db = SessionLocal()
try:
    # Run synchronously for immediate effect
    run_consolidation(db=db)
    print("Fusion Completed Successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Fusion Failed: {e}")
finally:
    db.close()
