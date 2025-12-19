from app.db.session import SessionLocal
from app.models.product import Product

def check_pc_games():
    db = SessionLocal()
    try:
        # Check for exact match or similar
        count = db.query(Product).filter(Product.console_name == "PC Games").count()
        print(f"Exact match 'PC Games': {count}")

        # Check for variations
        like_count = db.query(Product).filter(Product.console_name.ilike("%PC%")).count()
        print(f"Like '%PC%': {like_count}")
        
        if like_count > 0:
            samples = db.query(Product).filter(Product.console_name.ilike("%PC%")).limit(5).all()
            for s in samples:
                print(f"Sample: {s.console_name} - {s.product_name}")

    finally:
        db.close()

if __name__ == "__main__":
    check_pc_games()
