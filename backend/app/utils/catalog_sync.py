from sqlalchemy import text
from sqlalchemy.orm import Session
from ..models import Metadata, SparkMetadata, PostgresMetadata, OpenSearchMetadata


def sync_create(db: Session, meta: Metadata):
    if meta.catalog_name == "spark":
        db.add(
            SparkMetadata(
                id=meta.id,
                table_name=meta.object_name,
                schema_name="public",
                columns="[]",
            )
        )

    elif meta.catalog_name == "postgres":
        db.add(
            PostgresMetadata(
                id=meta.id,
                table_name=meta.object_name,
                owner=meta.owner_name or "",
                schema="public",
            )
        )

    elif meta.catalog_name == "opensearch":
        db.add(
            OpenSearchMetadata(
                id=meta.id,
                index_name=meta.object_name,
                shards=1,
                replicas=1,
            )
        )

    db.commit()


def sync_update(db: Session, meta: Metadata):

    if meta.catalog_name == "spark":
        db.execute(
            text("DELETE FROM spark_metadata WHERE id = :mid"),
            {"mid": meta.id},
        )

        db.add(
            SparkMetadata(
                id=meta.id,
                table_name=meta.object_name,
                schema_name="public",
                columns="[]",
            )
        )

    elif meta.catalog_name == "postgres":
        db.execute(
            text("DELETE FROM postgres_metadata WHERE id = :mid"),
            {"mid": meta.id},
        )

        db.add(
            PostgresMetadata(
                id=meta.id,
                table_name=meta.object_name,
                owner=meta.owner_name or "",
                schema="public",
            )
        )

    elif meta.catalog_name == "opensearch":
        db.execute(
            text("DELETE FROM opensearch_metadata WHERE id = :mid"),
            {"mid": meta.id},
        )

        db.add(
            OpenSearchMetadata(
                id=meta.id,
                index_name=meta.object_name,
                shards=1,
                replicas=1,
            )
        )

    db.commit()


def sync_delete(db: Session, meta: Metadata):
    """Delete catalog‑specific entry using internal id.
    The core Metadata row is deleted separately by the caller.
    """
    if meta.catalog_name == "spark":
        db.execute(
            text("DELETE FROM spark_metadata WHERE id = :mid"),
            {"mid": meta.id},
        )
    elif meta.catalog_name == "postgres":
        db.execute(
            text("DELETE FROM postgres_metadata WHERE id = :mid"),
            {"mid": meta.id},
        )
    elif meta.catalog_name == "opensearch":
        db.execute(
            text("DELETE FROM opensearch_metadata WHERE id = :mid"),
            {"mid": meta.id},
        )
    db.commit()