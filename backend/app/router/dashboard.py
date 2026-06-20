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


@router.get("/stats", response_model=dict, summary="Get dashboard statistics", description="Retrieve general system stats, caching rates, consistency score, search adoption, and weighted federation intelligence score.")
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

    # Dashboard Analytics aggregates from AuditLog
    natural_search_requests = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_(["NATURAL_SEARCH", "CLIENT_NATURAL_SEARCH"]))
        .count()
    )
    catalog_discovery_requests = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_(["CATALOG_DISCOVERY", "CLIENT_DISCOVERY"]))
        .count()
    )
    consistency_checks = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_(["CONSISTENCY_CHECK", "CLIENT_CONSISTENCY_CHECK"]))
        .count()
    )
    reconciliations = (
        db.query(AuditLog)
        .filter(AuditLog.action == "RECONCILE")
        .count()
    )
    smart_client_requests = (
        db.query(AuditLog)
        .filter(AuditLog.action.in_([
            "CLIENT_SEARCH",
            "CLIENT_DISCOVERY",
            "CLIENT_NATURAL_SEARCH",
            "CLIENT_CONSISTENCY_CHECK"
        ]))
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

        # Advanced Dashboard Analytics
        "natural_search_requests": natural_search_requests,
        "catalog_discovery_requests": catalog_discovery_requests,
        "consistency_checks": consistency_checks,
        "reconciliations": reconciliations,
        "smart_client_requests": smart_client_requests,

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


@router.get("/events", response_model=List[EventResponse], summary="Get recent events", description="Get a list of the 10 most recent metadata events from the timeline.")
def recent_events(db: Session = Depends(get_db)) -> List[EventResponse]:
    events = (
        db.query(MetadataEvent)
        .order_by(MetadataEvent.timestamp.desc())
        .limit(10)
        .all()
    )

    return [EventResponse.from_orm(e) for e in events]


@router.get("/audits", response_model=List[AuditLogResponse], summary="Get recent audits", description="Get a list of the 10 most recent system audit log records.")
def recent_audits(db: Session = Depends(get_db)) -> List[AuditLogResponse]:
    audits = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )

    return [AuditLogResponse.from_orm(a) for a in audits]