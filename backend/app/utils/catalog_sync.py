from sqlalchemy.orm import Session
from ..models import Metadata, SparkMetadata, PostgresMetadata, OpenSearchMetadata


def sync_create(db: Session, meta: Metadata):
    """Insert a record into the appropriate catalog‑specific table.
    Called after a core Metadata row has been created.
    """
    if meta.catalog_name == "spark":
        db.add(SparkMetadata(id=meta.id, table_name=meta.object_name, schema_name="public", columns="[]"))
    elif meta.catalog_name == "postgres":
        db.add(PostgresMetadata(id=meta.id, table_name=meta.object_name, owner=meta.owner_name or "", schema="public"))
    elif meta.catalog_name == "opensearch":
        db.add(OpenSearchMetadata(id=meta.id, index_name=meta.object_name, shards=1, replicas=1))
    # "public" catalog does not have a separate table – data lives only in core metadata.
    db.commit()


def sync_update(db: Session, meta: Metadata):
    """Update the catalog‑specific row to stay in sync with core Metadata.
    The simple approach is to delete the old row and re‑insert.
    """
    # Delete existing catalog‑specific row (if any)
    if meta.catalog_name == "spark":
        db.execute("DELETE FROM spark_metadata WHERE id = :mid", {"mid": meta.id})
        db.add(SparkMetadata(id=meta.id, table_name=meta.object_name, schema_name="public", columns="[]"))
    elif meta.catalog_name == "postgres":
        db.execute("DELETE FROM postgres_metadata WHERE id = :mid", {"mid": meta.id})
        db.add(PostgresMetadata(id=meta.id, table_name=meta.object_name, owner=meta.owner_name or "", schema="public"))
    elif meta.catalog_name == "opensearch":
        db.execute("DELETE FROM opensearch_metadata WHERE id = :mid", {"mid": meta.id})
        db.add(OpenSearchMetadata(id=meta.id, index_name=meta.object_name, shards=1, replicas=1))
    db.commit()


def sync_delete(db: Session, meta: Metadata):
    """Remove the catalog‑specific row when core Metadata is deleted."""
    if meta.catalog_name == "spark":
        db.execute("DELETE FROM spark_metadata WHERE id = :mid", {"mid": meta.id})
    elif meta.catalog_name == "postgres":
        db.execute("DELETE FROM postgres_metadata WHERE id = :mid", {"mid": meta.id})
    elif meta.catalog_name == "opensearch":
        db.execute("DELETE FROM opensearch_metadata WHERE id = :mid", {"mid": meta.id})
    # No action needed for "public".
    db.commit()
