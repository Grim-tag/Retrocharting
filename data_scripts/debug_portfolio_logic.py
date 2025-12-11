import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# Mock Models for standalone testing
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    product_name = Column(String)
    console_name = Column(String)
    loose_price = Column(Float)
    cib_price = Column(Float)
    new_price = Column(Float)
    image_url = Column(String)

class CollectionItem(Base):
    __tablename__ = "collection_items"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    condition = Column(String)
    paid_price = Column(Float)
    added_at = Column(DateTime, default=datetime.utcnow)

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    date = Column(DateTime)
    price = Column(Float)
    condition = Column(String)

# Setup In-Memory DB
engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Seed Data
user = User(id=1)
db.add(user)

prod1 = Product(id=101, product_name="Mario 64", console_name="N64", loose_price=50.0, cib_price=100.0, new_price=500.0)
db.add(prod1)

item1 = CollectionItem(id=1, user_id=1, product_id=101, condition="LOOSE", paid_price=10.0)
db.add(item1)

db.commit()

# --- THE LOGIC FROM portfolio.py ---

def get_portfolio_history(db, range_days=30, current_user_id=1):
    print("Running portfolio history logic...")
    items = db.query(CollectionItem, Product).join(Product, CollectionItem.product_id == Product.id)\
        .filter(CollectionItem.user_id == current_user_id).all()
        
    if not items:
        print("No items found.")
        return []

    item_product_map = {item.id: item.product_id for item, prod in items}
    product_ids = [item.product_id for item, prod in items]
    
    # 2. Get Price History
    # Simulate empty history
    history_records = [] # EMPTY
    
    price_map = {} 
    
    for h in history_records:
        if h.product_id not in price_map: price_map[h.product_id] = {}
        cond_u = h.condition.upper()
        if cond_u == "USED": cond_u = "LOOSE"
        if cond_u == "COMPLETE": cond_u = "CIB"
        if cond_u not in price_map[h.product_id]: price_map[h.product_id][cond_u] = {}
        price_map[h.product_id][cond_u][h.date] = h.price

    # 3. Iterate days
    chart_data = []
    today = datetime.utcnow().date()
    
    print(f"Iterating {range_days} days...")
    for i in range(range_days, -1, -1):
        current_date = today - timedelta(days=i)
        daily_total = 0.0
        
        for item, product in items:
            p_id = item.product_id
            cond = item.condition
            # Graded fallback
            if cond == 'GRADED': cond = 'NEW'
            
            price = 0.0
            if p_id in price_map and cond in price_map[p_id]:
                date_prices = price_map[p_id][cond]
                for lookback in range(0, 7):
                    d_check = current_date - timedelta(days=lookback)
                    if d_check in date_prices:
                        price = date_prices[d_check]
                        break
            
            # Fallback to current price if history missing
            if price == 0.0:
                 if cond == 'LOOSE': price = product.loose_price or 0
                 elif cond == 'CIB': price = product.cib_price or 0
                 elif cond == 'NEW': price = product.new_price or 0
                 elif cond == 'GRADED': price = product.new_price or 0
            
            daily_total += price
            
        chart_data.append({
            "date": current_date.isoformat(),
            "value": round(daily_total, 2)
        })
    
    print(f"Generated {len(chart_data)} points.")
    if len(chart_data) > 0:
        print("Sample:", chart_data[-1])
    return chart_data

try:
    result = get_portfolio_history(db)
    print("Success!")
except Exception as e:
    import traceback
    traceback.print_exc()
    print("Failed")
