from sqlalchemy import Column, Integer, String, DateTime, func
from .models import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)  # LOGIN, CREATE, UPDATE, DELETE, SEARCH, CACHE_HIT, CACHE_MISS
    catalog_name = Column(String(100), nullable=True)
    metadata_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
