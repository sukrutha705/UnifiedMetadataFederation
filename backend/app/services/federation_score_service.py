# backend/app/services/federation_score_service.py

from sqlalchemy.orm import Session
import redis

from ..models_audit import AuditLog
from ..services.consistency_service import calculate_consistency_score
from ..registry import registry


def calculate_federation_score(
    db: Session,
    redis_cli: redis.Redis,
):
    """
    Federation Intelligence Score

    Components:
    - Consistency Health (40%)
    - Cache Efficiency (25%)
    - Catalog Connectivity (20%)
    - Search Adoption (15%)

    Final score: 0-100
    """

    # -----------------------------
    # Consistency Component (40%)
    # -----------------------------
    consistency = calculate_consistency_score(db)
    consistency_component = consistency.consistency_score

    # -----------------------------
    # Cache Component (25%)
    # -----------------------------
    hits = int(redis_cli.get("cache:hit") or 0)
    misses = int(redis_cli.get("cache:miss") or 0)

    if hits + misses > 0:
        cache_component = round(
            (hits / (hits + misses)) * 100,
            2,
        )
    else:
        cache_component = 100.0

    # -----------------------------
    # Catalog Connectivity (20%)
    # -----------------------------
    connected_catalogs = len(registry.list_catalogs())

    # Expecting 4 catalogs in MVP
    catalog_component = min(
        (connected_catalogs / 4) * 100,
        100,
    )

    # -----------------------------
    # Search Adoption (15%)
    # -----------------------------
    discovery_count = (
        db.query(AuditLog)
        .filter(AuditLog.action == "CATALOG_DISCOVERY")
        .count()
    )

    natural_count = (
        db.query(AuditLog)
        .filter(AuditLog.action == "NATURAL_SEARCH")
        .count()
    )

    total_searches = discovery_count + natural_count

    if total_searches >= 10:
        search_component = 100
    else:
        search_component = total_searches * 10

    # -----------------------------
    # Weighted Final Score
    # -----------------------------
    final_score = round(
        (
            consistency_component * 0.40
            + cache_component * 0.25
            + catalog_component * 0.20
            + search_component * 0.15
        ),
        2,
    )

    # Classification
    if final_score >= 95:
        status = "Elite"
    elif final_score >= 85:
        status = "Healthy"
    elif final_score >= 70:
        status = "Warning"
    else:
        status = "Critical"

    return {
        "federation_score": final_score,
        "federation_status": status,
        "consistency_component": consistency_component,
        "cache_component": cache_component,
        "catalog_component": catalog_component,
        "search_component": search_component,
    }