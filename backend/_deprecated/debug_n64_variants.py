from sqlalchemy import create_engine, text
from app.core.config import settings

# Setup DB connection
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

def check_n64_variants():
    with engine.connect() as conn:
        # 1. Find the "Nintendo 64 System" Game
        print("\n--- FINDING 'Nintendo 64 System' GAME ---")
        result = conn.execute(text("SELECT id, title, slug FROM games WHERE title LIKE 'Nintendo 64 System' OR title LIKE 'Nintendo 64 Console' LIMIT 5"))
        game_rows = result.fetchall()
        
        target_game_id = None
        for row in game_rows:
            print(f"Game Found: ID={row.id}, Title='{row.title}', Slug='{row.slug}'")
            if row.title == "Nintendo 64 System":
                target_game_id = row.id

        if not target_game_id:
            print("Could not find exact 'Nintendo 64 System' game ID.")
            if game_rows:
                target_game_id = game_rows[0].id # Pick first closest
                print(f"Using Game ID {target_game_id}")
            else:
                return

        # 2. List all Products (variants) associated with this Game
        print(f"\n--- VARIANTS FOR GAME ID {target_game_id} ---")
        variants = conn.execute(text(f"SELECT id, product_name, console_name, game_id FROM products WHERE game_id = {target_game_id}"))
        count = 0
        for v in variants:
            count += 1
            print(f"Variant: ID={v.id}, Name='{v.product_name}'")
        print(f"Total Variants: {count}")

        # 3. Check specific bundle mentioned by user to see if it exists as a separate Game or Product
        print("\n--- CHECKING 'Pokemon Stadium Battle Set' ---")
        bundle_query = conn.execute(text("SELECT id, product_name, game_id FROM products WHERE product_name LIKE '%Pokemon Stadium Battle Set%' AND console_name LIKE '%Nintendo 64%'"))
        for b in bundle_query:
            print(f"Found Product: ID={b.id}, Name='{b.product_name}', Game ID={b.game_id}")
            if b.game_id == target_game_id:
                print("-> LINKED TO MAIN SYSTEM GAME (Problem confirmed)")
            else:
                print(f"-> Linked to Game ID {b.game_id} (Checking that game...)")
                bg = conn.execute(text(f"SELECT title, slug FROM games WHERE id = {b.game_id}")).fetchone()
                if bg:
                    print(f"   -> Belongs to Game: '{bg.title}' (Slug: {bg.slug})")

if __name__ == "__main__":
    check_n64_variants()
