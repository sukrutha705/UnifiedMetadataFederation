# backend/app/router/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import redis

from ..dependencies import get_db, get_redis
from ..registry import registry
from ..models import Metadata
from ..models_audit import AuditLog
from ..models import MetadataEvent
# Consistency metrics service
from ..services.consistency_service import calculate_consistency_score

router = APIRouter()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), redis_cli: redis.Redis = Depends(get_redis)):
    total_metadata = db.query(Metadata).count()
    catalogs = registry.list_catalogs()
    hit = int(redis_cli.get("cache:hit") or 0)
    miss = int(redis_cli.get("cache:miss") or 0)

    # Consistency metrics
    consistency = calculate_consistency_score(db)

    return {
        "connected_catalogs": len(catalogs),
        "metadata_count": total_metadata,
        "cache_hits": hit,
        "cache_misses": miss,
        "cache_hit_rate": round((hit / (hit + miss)) * 100, 1) if (hit + miss) else 0,
        "cache_miss_rate": round((miss / (hit + miss)) * 100, 1) if (hit + miss) else 0,
        # Consistency metrics fields
        "consistency_score": consistency.consistency_score,
        "consistent_objects": consistency.consistent_objects,
        "inconsistent_objects": consistency.inconsistent_objects,
    }


@router.get("/events")
def recent_events(db: Session = Depends(get_db)):
    events = (
        db.query(MetadataEvent)
        .order_by(MetadataEvent.timestamp.desc())
        .limit(10)
        .all()
    )
    # Convert to dicts for JSON response
    return [e.__dict__ for e in events]


@router.get("/audits")
def recent_audits(db: Session = Depends(get_db)):
    audits = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )
    return [a.__dict__ for a in audits]
