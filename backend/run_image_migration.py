"""
Image Migration Script - Run from backend directory
Downloads external images, converts to WebP, stores in database.
"""
import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import models in correct order to avoid circular dependencies
from app.models.game import Game  # Must be first
from app.models.product import Product
from app.db.session import SessionLocal
from app.services.image_migration import migrate_product_images

def main():
    db = SessionLocal()
    
    try:
        # Count pending migrations
        pending = db.query(Product).filter(
            Product.image_url != None,
            Product.image_url != "",
            Product.image_url.contains("http"),
            Product.image_blob == None
        ).count()
        
        # Count already migrated
        migrated = db.query(Product).filter(
            Product.image_blob != None
        ).count()
        
        print(f"=== IMAGE MIGRATION STATUS ===")
        print(f"Already migrated: {migrated}")
        print(f"Pending migration: {pending}")
        print(f"==============================")
        
        if pending == 0:
            print("No images to migrate!")
            return
        
        print(f"\nStarting migration of {pending} images...")
        print("This may take a while. Press Ctrl+C to stop.\n")
        
        # Run migration in batches
        batch_size = 100
        total_migrated = 0
        
        while True:
            result = migrate_product_images(db, limit=batch_size)
            total_migrated += result.get("migrated", 0)
            
            print(f"Batch complete: {result.get('migrated', 0)} migrated, Total: {total_migrated}")
            
            if result.get("migrated", 0) == 0:
                print("\nMigration complete!")
                break
                
            # Check remaining
            remaining = db.query(Product).filter(
                Product.image_url != None,
                Product.image_url.contains("http"),
                Product.image_blob == None
            ).filter(~Product.image_url.contains("retrocharting.com")).count()
            
            print(f"Remaining: {remaining}")
            
            if remaining == 0:
                break
        
        print(f"\n=== MIGRATION COMPLETE ===")
        print(f"Total images migrated: {total_migrated}")
        
    except KeyboardInterrupt:
        print("\nMigration stopped by user.")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
