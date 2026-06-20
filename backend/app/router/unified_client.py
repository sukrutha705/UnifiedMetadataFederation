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
    ReconciliationResponse,
    MetadataCreate,
    MetadataUpdate,
    MetadataResponse,
)
from ..services.smart_metadata_client import SmartMetadataClient
from .federation import require_read_role, require_role

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


@router.post("/reconcile/{object_name}", response_model=ReconciliationResponse, summary="Reconcile metadata object", description="Reconcile metadata for the given object using the consistency service, with audit logging.")
def client_reconcile(
    object_name: str,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    """Unified endpoint to reconcile a metadata object across catalogs, with audit logging."""
    try:
        res = SmartMetadataClient.reconcile_object(object_name, db, redis_cli=redis_cli, user=user)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
        
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_RECONCILIATION",
    )
    return res


# ------------------- SMART CLIENT CRUD -------------------

@router.post("/metadata", response_model=MetadataResponse, summary="Create metadata entry", description="Create a new federated metadata entry via Smart Metadata Client, synchronizing catalog-specific tables and rebuilding the cache, with audit logging.")
def client_create_metadata(
    payload: MetadataCreate,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    """Create metadata entry with synchronization, caching, and audit logging."""
    res = SmartMetadataClient.create_metadata(payload, db, redis_cli, user)
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_CREATE",
        catalog_name=res.catalog_name,
        metadata_id=res.id,
    )
    return res


@router.get("/metadata", response_model=list[MetadataResponse], summary="List all metadata", description="Retrieve all unified metadata records via Smart Metadata Client, with audit logging.")
def client_list_metadata(
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    """Retrieve all metadata with client audit logging."""
    res = SmartMetadataClient.list_metadata(db)
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_LIST",
    )
    return res


@router.get("/metadata/{metadata_id}", response_model=MetadataResponse, summary="Get metadata by ID", description="Retrieve a specific metadata record by its ID via Smart Metadata Client, with audit logging.")
def client_get_metadata(
    metadata_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    """Retrieve a specific metadata record by ID with client audit logging."""
    try:
        res = SmartMetadataClient.get_metadata(metadata_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")
        
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_READ",
        catalog_name=res.catalog_name,
        metadata_id=res.id,
    )
    return res


@router.put("/metadata/{metadata_id}", response_model=MetadataResponse, summary="Update metadata entry", description="Modify an existing metadata record via Smart Metadata Client, sync-updating catalog tables and updating the cache, with audit logging.")
def client_update_metadata(
    metadata_id: int,
    payload: MetadataUpdate,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    """Modify an existing metadata record with synchronization, caching, and audit logging."""
    try:
        res = SmartMetadataClient.update_metadata(metadata_id, payload, db, redis_cli, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")
        
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_UPDATE",
        catalog_name=res.catalog_name,
        metadata_id=res.id,
    )
    return res


@router.delete("/metadata/{metadata_id}", response_model=dict, summary="Delete metadata entry", description="Delete a metadata record via Smart Metadata Client, cleanly removing catalog-specific entries, auditing the action, and invalidating the cache.")
def client_delete_metadata(
    metadata_id: int,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin"])),
):
    """Delete a metadata record with synchronization, caching, and audit logging."""
    try:
        # Retrieve the meta object first to log catalog_name and metadata_id in write_audit
        meta = SmartMetadataClient.get_metadata(metadata_id, db)
        catalog_name = meta.catalog_name
        res = SmartMetadataClient.delete_metadata(metadata_id, db, redis_cli, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")
        
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CLIENT_DELETE",
        catalog_name=catalog_name,
        metadata_id=metadata_id,
    )
    return res
