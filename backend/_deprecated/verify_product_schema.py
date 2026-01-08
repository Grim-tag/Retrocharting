
from app.db.session import SessionLocal
from app.models.game import Game
from app.models.product import Product as ProductModel
from app.schemas.product import Product as ProductSchema

def verify_schema():
    db = SessionLocal()
    try:
        # Fetch Product 90
        p = db.query(ProductModel).filter(ProductModel.id == 90).first()
        if not p:
            print("Product 90 not found!")
            return

        print(f"DB Value - Box Only: {p.box_only_price}")
        
        # Serialize with Pydantic
        schema = ProductSchema.from_orm(p)
        print(f"Schema Value - Box Only: {schema.box_only_price}")
        
        # Check dictionary dump
        dump = schema.dict()
        print(f"JSON Dump - Box Only: {dump.get('box_only_price')}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_schema()
