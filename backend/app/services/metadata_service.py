from sqlalchemy.orm import Session
import redis
from typing import Dict

from ..models import Metadata
from ..schemas import MetadataCreate, MetadataUpdate, MetadataResponse
from ..utils.audit import write_audit
from ..events import log_event
from ..cache import invalidate_cache, rebuild_cache, flush_search_cache
from ..utils.catalog_sync import sync_create, sync_update, sync_delete


def _audit_and_event(db: Session, user: dict, action: str, meta: Metadata):
    """Helper to write audit log and timeline event."""
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action=action,
        catalog_name=meta.catalog_name,
        metadata_id=meta.id,
    )
    # Map CRUD actions to event types
    event_type = {
        "CREATE": "CREATED",
        "UPDATE": "UPDATED",
        "DELETE": "DELETED",
    }.get(action, "UNKNOWN")
    log_event(db, meta.id, event_type)


def create_metadata(
    payload: MetadataCreate,
    db: Session,
    redis_cli: redis.Redis,
    user: dict,
) -> MetadataResponse:
    meta = Metadata(**payload.dict())
    db.add(meta)
    db.commit()
    db.refresh(meta)

    # Synchronize catalog‑specific table
    sync_create(db, meta)

    # Cache handling
    invalidate_cache(redis_cli, meta.catalog_name, meta.id)
    rebuild_cache(redis_cli, db, meta.catalog_name)
    flush_search_cache(redis_cli)

    _audit_and_event(db, user, "CREATE", meta)
    return meta


def update_metadata(
    metadata_id: int,
    payload: MetadataUpdate,
    db: Session,
    redis_cli: redis.Redis,
    user: dict,
) -> MetadataResponse:
    meta = db.query(Metadata).filter(Metadata.id == metadata_id).first()
    if not meta:
        raise ValueError("Metadata not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(meta, field, value)

    db.commit()
    db.refresh(meta)

    sync_update(db, meta)
    invalidate_cache(redis_cli, meta.catalog_name, meta.id)
    rebuild_cache(redis_cli, db, meta.catalog_name)
    flush_search_cache(redis_cli)

    _audit_and_event(db, user, "UPDATE", meta)
    return meta


def delete_metadata(
    metadata_id: int,
    db: Session,
    redis_cli: redis.Redis,
    user: dict,
) -> Dict[str, str]:
    meta = db.query(Metadata).filter(Metadata.id == metadata_id).first()
    if not meta:
        raise ValueError("Metadata not found")

    # Store catalog name before deletion for cache invalidation
    catalog_name = meta.catalog_name

    # Synchronize catalog‑specific tables (remove entry) using active meta
    sync_delete(db, meta)

    # Write audit log and timeline event before deleting the record
    _audit_and_event(db, user, "DELETE", meta)

    # Remove core record
    db.delete(meta)
    db.commit()

    # Cache handling
    invalidate_cache(redis_cli, catalog_name, metadata_id)
    flush_search_cache(redis_cli)

    return {"message": "deleted successfully"}
