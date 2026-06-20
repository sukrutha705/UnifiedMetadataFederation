# backend/app/router/dashboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import redis
from typing import List

from ..dependencies import get_db, get_redis
from ..registry import registry
from ..models import Metadata, MetadataEvent
from ..models_audit import AuditLog
from ..schemas import EventResponse, AuditLogResponse

# Consistency metrics service
from ..services.consistency_service import calculate_consistency_score
from ..services.federation_score_service import calculate_federation_score

router = APIRouter()


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
):
    total_metadata = db.query(Metadata).count()
    catalogs = registry.list_catalogs()

    hit = int(redis_cli.get("cache:hit") or 0)
    miss = int(redis_cli.get("cache:miss") or 0)

    # Consistency metrics
    consistency = calculate_consistency_score(db)
    federation = calculate_federation_score(db,redis_cli,)

    # Natural language search requests
    natural_requests = (
        db.query(AuditLog)
        .filter(AuditLog.action == "NATURAL_SEARCH")
        .count()
    )

    return {
        "connected_catalogs": len(catalogs),
        "metadata_count": total_metadata,
        "cache_hits": hit,
        "cache_misses": miss,
        "cache_hit_rate": round((hit / (hit + miss)) * 100, 1)
        if (hit + miss)
        else 0,
        "cache_miss_rate": round((miss / (hit + miss)) * 100, 1)
        if (hit + miss)
        else 0,

        # Consistency metrics
        "consistency_score": consistency.consistency_score,
        "consistent_objects": consistency.consistent_objects,
        "inconsistent_objects": consistency.inconsistent_objects,

        # Natural Search metric
        "natural_search_requests": natural_requests,
        # Federation Intelligence Score
       "federation_score": federation["federation_score"],
       "federation_status": federation["federation_status"],

        # Score Breakdown
       "consistency_component": federation["consistency_component"],
       "cache_component": federation["cache_component"],
       "catalog_component": federation["catalog_component"],
       "search_component": federation["search_component"],

        # Smart Client abstraction metrics
        "smart_client_enabled": True,
        "abstraction_layer": "Smart Metadata Client",
    }


@router.get("/events")
def recent_events(db: Session = Depends(get_db)) -> List[EventResponse]:
    events = (
        db.query(MetadataEvent)
        .order_by(MetadataEvent.timestamp.desc())
        .limit(10)
        .all()
    )

    return [EventResponse.from_orm(e) for e in events]


@router.get("/audits")
def recent_audits(db: Session = Depends(get_db)) -> List[AuditLogResponse]:
    audits = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )

    return [AuditLogResponse.from_orm(a) for a in audits]