import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import redis
from jose import JWTError, jwt
from typing import List

from ..dependencies import get_db, get_redis
from ..services.smart_metadata_client import SmartMetadataClient
from ..schemas import (
    FederationSearchResponse,
    CatalogSuggestion,
    ConsistencyResponse,
    ReconciliationResponse,
    MetadataCreate,
    MetadataUpdate,
    MetadataResponse
)
from ..models import Metadata
from ..events import log_event
from ..utils.audit import write_audit

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET_KEY", "supersecretkey"),
            algorithms=["HS256"],
        )
        return {"username": payload.get("sub"), "role": payload.get("role")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

def require_role(allowed_roles: list):
    def role_checker(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return role_checker

def require_read_role(user=Depends(get_current_user)):
    if user["role"] not in ["Admin", "Engineer", "Viewer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    return user

def get_smart_client(
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis)
) -> SmartMetadataClient:
    return SmartMetadataClient(db, redis_cli)


@router.get("/search", response_model=FederationSearchResponse)
def search_metadata(
    q: str,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_read_role)
):
    return client.search_metadata(q, user)

@router.get("/discover", response_model=List[CatalogSuggestion])
def discover_catalogs(
    q: str,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_read_role)
):
    return client.discover_catalogs(q)

@router.get("/natural", response_model=List[CatalogSuggestion])
def natural_search(
    q: str,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_read_role)
):
    return client.natural_search(q)

@router.get("/consistency/{object_name}", response_model=ConsistencyResponse)
def check_consistency(
    object_name: str,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_read_role)
):
    try:
        result = client.check_consistency(object_name)
    except ValueError:
        raise HTTPException(status_code=404, detail="Object not found")

    write_audit(
        client.db,
        username=user["username"],
        role=user["role"],
        action="CONSISTENCY_CHECK",
        catalog_name=None,
        metadata_id=None,
    )
    meta = client.db.query(Metadata).filter(Metadata.object_name == object_name).first()
    if meta:
        log_event(client.db, meta.id, "CONSISTENCY_CHECKED")
    return result

@router.post("/reconcile/{object_name}", response_model=ReconciliationResponse)
def reconcile(
    object_name: str,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_role(["Admin", "Engineer"]))
):
    try:
        return client.reconcile(object_name, user)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/create", response_model=MetadataResponse)
def create_metadata(
    payload: MetadataCreate,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_role(["Admin", "Engineer"]))
):
    return client.create_metadata(payload, user)

@router.put("/update/{metadata_id}", response_model=MetadataResponse)
def update_metadata(
    metadata_id: int,
    payload: MetadataUpdate,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_role(["Admin", "Engineer"]))
):
    try:
        return client.update_metadata(metadata_id, payload, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")

@router.delete("/delete/{metadata_id}")
def delete_metadata(
    metadata_id: int,
    client: SmartMetadataClient = Depends(get_smart_client),
    user=Depends(require_role(["Admin"]))
):
    try:
        return client.delete_metadata(metadata_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")

unified_client_router = router
