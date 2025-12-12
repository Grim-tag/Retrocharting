from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.db.session import Base

class ScraperLog(Base):
    __tablename__ = "scraper_logs"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    items_processed = Column(Integer, default=0)
    status = Column(String, default="running") # 'running', 'completed', 'error'
    error_message = Column(String, nullable=True)
    source = Column(String, default="scraper") # 'scraper', 'igdb'
