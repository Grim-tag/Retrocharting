from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.db.session import Base

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    locale = Column(String, index=True, nullable=False)  # 'en', 'fr'
    key = Column(String, index=True, nullable=False)     # 'home.hero.title'
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('locale', 'key', name='uix_locale_key'),
    )
