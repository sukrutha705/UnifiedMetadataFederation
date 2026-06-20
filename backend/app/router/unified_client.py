# backend/app/router/unified_client.py

import redis
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..dependencies import get_db, get_redis
from ..utils.audit import write_audit
from ..schemas import (
    FederationSearchResponse,
    CatalogSuggestion,
    ConsistencyResponse,
)
from ..services.smart_metadata_client import SmartMetadataClient
from .federation import require_read_role

router = APIRouter()


@router.get("/search", response_model=FederationSearchResponse)
def client_search(
    q: str,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_read_role),
):
    """Unified endpoint to search metadata, with audit logging."""
    res = SmartMetadataClient.search_metadata(q, db, redis_cli=redis_cli, user=user)
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_SEARCH",
    )
    return res


@router.get("/discover", response_model=List[CatalogSuggestion])
def client_discover(
    q: str,
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    """Unified endpoint to discover catalogs, with audit logging."""
    res = SmartMetadataClient.discover_catalogs(q, db)
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_DISCOVERY",
    )
    return res


@router.get("/natural", response_model=List[CatalogSuggestion])
def client_natural(
    q: str,
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    """Unified endpoint for natural language search, with audit logging."""
    res = SmartMetadataClient.natural_search(q, db)
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_NATURAL_SEARCH",
    )
    return res


@router.get("/consistency/{object_name}", response_model=ConsistencyResponse)
def client_consistency(
    object_name: str,
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    """Unified endpoint to check consistency of a metadata object across catalogs, with audit logging."""
    try:
        res = SmartMetadataClient.check_consistency(object_name, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Object not found")
        
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_CONSISTENCY_CHECK",
    )
    return res
