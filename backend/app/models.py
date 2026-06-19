from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    func,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Metadata(Base):
    __tablename__ = "metadata"

    id = Column(Integer, primary_key=True, index=True)
    catalog_name = Column(String(100), nullable=False)
    object_name = Column(String(255), nullable=False)
    object_type = Column(String(100), nullable=False)
    description = Column(Text)
    owner_name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("catalog_name", "object_name", name="uq_catalog_object"),
    )


class MetadataEvent(Base):
    __tablename__ = "metadata_events"

    event_id = Column(Integer, primary_key=True, index=True)
    metadata_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # CREATED, UPDATED, DELETED, SEARCHED, etc.
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# Simulated catalog‑specific tables
class SparkMetadata(Base):
    __tablename__ = "spark_metadata"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(255), nullable=False)
    schema_name = Column(String(255), nullable=False)
    columns = Column(Text)  # JSON string describing columns


class PostgresMetadata(Base):
    __tablename__ = "postgres_metadata"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(255), nullable=False)
    owner = Column(String(255))
    schema = Column(String(255))


class OpenSearchMetadata(Base):
    __tablename__ = "opensearch_metadata"

    id = Column(Integer, primary_key=True, index=True)
    index_name = Column(String(255), nullable=False)
    shards = Column(Integer, default=1)
    replicas = Column(Integer, default=1)
