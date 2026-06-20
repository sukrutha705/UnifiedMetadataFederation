# backend/app/services/consistency_service.py
"""Consistency detection and reconciliation services.

All logic works against the core ``Metadata`` table only. Catalog‑specific
tables (spark_metadata, postgres_metadata, opensearch_metadata) have their
own schemas and are **not** used for field comparison – the platform
compares the canonical metadata stored in ``Metadata`` for each catalog.

The service provides:
- ``check_consistency`` – Detects differing field values across catalog rows.
- ``get_source_of_truth`` – Returns the highest‑priority catalog that has a
  record for the given object (priority: spark > postgres > opensearch > public).
- ``reconcile_object`` – Copies the source‑of‑truth values to all other
  catalog rows, invalidates/rebuilds the cache and logs audit & timeline.
- ``calculate_consistency_score`` – Global metric over all distinct objects.
"""

from typing import Dict, List, Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from ..models import Metadata
from ..schemas import (
    MetadataConflict,
    ConsistencyResponse,
    ReconciliationResponse,
    ConsistencyMetricsResponse,
)
from ..utils.audit import write_audit
from ..events import log_event
from ..cache import invalidate_cache, rebuild_cache

# ----------------------------------------------------------------------
# Configurable catalog priority (lower number = higher priority)
# ----------------------------------------------------------------------
DEFAULT_PRIORITY = {
    "spark": 1,
    "postgres": 2,
    "opensearch": 3,
    "public": 4,
}


def get_source_of_truth(object_name: str, db: Session) -> Optional[str]:
    """Return the catalog name that should be treated as source of truth.

    The function looks for ``Metadata`` rows with the given ``object_name``
    and picks the catalog with the highest priority (lowest numeric value).
    Returns ``None`` if the object does not exist in any catalog.
    """
    rows = (
        db.query(Metadata.catalog_name)
        .filter(Metadata.object_name == object_name)
        .all()
    )
    catalogs = [r[0] for r in rows]
    if not catalogs:
        return None
    # Sort by priority; unknown catalogs get large number (placed last)
    sorted_catalogs = sorted(
        catalogs, key=lambda c: DEFAULT_PRIORITY.get(c, 999)
    )
    return sorted_catalogs[0]


def _fetch_metadata_rows(db: Session, object_name: str) -> Dict[str, Metadata]:
    """Return a mapping ``catalog_name -> Metadata`` for all rows with the object.
    """
    rows = (
        db.query(Metadata)
        .filter(Metadata.object_name == object_name)
        .all()
    )
    return {row.catalog_name: row for row in rows}


def check_consistency(db: Session, object_name: str) -> ConsistencyResponse:
    """Detect field conflicts for a given ``object_name`` across catalogs.

    If the object does not exist in the core table, ``ValueError`` is raised.
    """
    metadata_map = _fetch_metadata_rows(db, object_name)
    if not metadata_map:
        raise ValueError("Object not found")

    # Fields to compare – only those that exist in the core model.
    fields = ["object_type", "description", "owner_name"]
    conflicts: List[MetadataConflict] = []

    for field in fields:
        values: Dict[str, Any] = {}
        for catalog, meta in metadata_map.items():
            values[catalog] = getattr(meta, field)
        # Determine distinct non‑null values
        distinct_vals = {v for v in values.values() if v is not None}
        if len(distinct_vals) > 1:
            conflicts.append(MetadataConflict(field=field, values=values))

    consistent = len(conflicts) == 0
    return ConsistencyResponse(
        object_name=object_name, consistent=consistent, conflicts=conflicts
    )


def reconcile_object(
    object_name: str,
    db: Session,
    redis_cli,
    user: dict,
) -> ReconciliationResponse:
    """Reconcile metadata for ``object_name`` using the source‑of‑truth catalog.

    The function updates the ``Metadata`` rows of all lower‑priority catalogs
    to match the values from the source catalog. Cache invalidation/rebuild
    and audit/event logging are performed for each affected row.
    """
    metadata_map = _fetch_metadata_rows(db, object_name)
    if not metadata_map:
        raise ValueError("Object not found")

    source_catalog = get_source_of_truth(object_name, db)
    if not source_catalog:
        raise ValueError("No source of truth found for object")

    source_meta = metadata_map.get(source_catalog)
    if not source_meta:
        raise RuntimeError("Source catalog row vanished unexpectedly")

    # Fields to copy
    fields = ["object_type", "description", "owner_name"]
    updated_catalogs: List[str] = []

    for catalog, meta in metadata_map.items():
        if catalog == source_catalog:
            continue
        # Prepare update dict
        update_dict = {field: getattr(source_meta, field) for field in fields}
        db.query(Metadata).filter(Metadata.id == meta.id).update(update_dict)
        updated_catalogs.append(catalog)
        # Cache handling for each affected row
        invalidate_cache(redis_cli, catalog, meta.id)
        rebuild_cache(redis_cli, db, catalog)

    db.commit()

    # Audit & timeline
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="RECONCILE",
        catalog_name=source_catalog,
        metadata_id=source_meta.id,
    )
    # Global reconciliation event – we log per affected row as well
    for catalog in updated_catalogs:
        # Use the row id after update (same as before)
        row_id = metadata_map[catalog].id
        log_event(db, row_id, "RECONCILED")

    return ReconciliationResponse(
        object_name=object_name,
        source_of_truth=source_catalog,
        updated_catalogs=updated_catalogs,
        status="success",
    )


def calculate_consistency_score(db: Session) -> ConsistencyMetricsResponse:
    """Calculate overall consistency metrics across all distinct objects."""

    total_objects = db.query(Metadata.object_name).distinct().count()

    if total_objects == 0:
        return ConsistencyMetricsResponse(
            total_objects=0,
            consistent_objects=0,
            inconsistent_objects=0,
            consistency_score=0.0,
        )

    object_names = (
        db.query(Metadata.object_name)
        .distinct()
        .order_by(Metadata.object_name)
        .all()
    )

    consistent_cnt = 0
    inconsistent_cnt = 0

    print("\n========== CONSISTENCY DEBUG ==========")

    for (obj_name,) in object_names:
        try:
            resp = check_consistency(db, obj_name)

            if resp.consistent:
                consistent_cnt += 1
                print(f"[CONSISTENT] {obj_name}")
            else:
                inconsistent_cnt += 1
                print(
                    f"[INCONSISTENT] {obj_name} "
                    f"Conflicts={len(resp.conflicts)}"
                )

        except Exception as e:
            inconsistent_cnt += 1
            print(f"[ERROR] {obj_name}: {str(e)}")

    print("---------------------------------------")
    print(f"TOTAL OBJECTS       : {total_objects}")
    print(f"CONSISTENT OBJECTS  : {consistent_cnt}")
    print(f"INCONSISTENT OBJECTS: {inconsistent_cnt}")
    print("=======================================\n")

    score = round((consistent_cnt / total_objects) * 100, 2)

    return ConsistencyMetricsResponse(
        total_objects=total_objects,
        consistent_objects=consistent_cnt,
        inconsistent_objects=inconsistent_cnt,
        consistency_score=score,
    )