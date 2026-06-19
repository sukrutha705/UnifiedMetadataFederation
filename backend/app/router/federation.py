from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import redis
from jose import JWTError, jwt

from ..dependencies import get_db, get_redis
from ..registry import registry
from ..cache import get_federation_cache, set_federation_cache
from ..utils.audit import write_audit
from ..schemas import (
    FederationSearchResponse,
    FederationResult,
    MetadataCreate,
    MetadataUpdate,
    MetadataResponse,
)

# Shared service functions that encapsulate CRUD logic without duplication
from ..services.metadata_service import (
    create_metadata as svc_create_metadata,
    update_metadata as svc_update_metadata,
    delete_metadata as svc_delete_metadata,
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, "supersecretkey", algorithms=["HS256"])
        return {"username": payload.get("sub"), "role": payload.get("role")}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def require_role(allowed_roles: list):
    def role_checker(user=Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return role_checker


def require_read_role(user=Depends(get_current_user)):
    if user["role"] not in ["Admin", "Engineer", "Viewer"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


@router.get("/search", response_model=FederationSearchResponse)
def federation_search(
    q: str,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_read_role),
):
    # Cache lookup
    cached = get_federation_cache(redis_cli, q)
    if cached:
        write_audit(db, username=user["username"], role=user["role"], action="CACHE_HIT")
        return FederationSearchResponse(**cached)

    results = []
    for catalog_name in registry.list_catalogs():
        adapter = registry.get_catalog(catalog_name)
        try:
            catalog_results = adapter.search(db, q)
            for item in catalog_results:
                results.append(FederationResult(catalog=item["catalog"], object_name=item["object_name"]))
        except Exception as e:
            print(f"Catalog search failed for {catalog_name}: {e}")

    response = FederationSearchResponse(query=q, results=results)
    set_federation_cache(redis_cli, q, response.model_dump())
    write_audit(db, username=user["username"], role=user["role"], action="CACHE_MISS")
    return response

# ------------------- FEDERATION CRUD -------------------

@router.post("/create", response_model=MetadataResponse)
def federation_create(
    payload: MetadataCreate,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    return svc_create_metadata(payload, db, redis_cli, user)

@router.put("/update/{metadata_id}", response_model=MetadataResponse)
def federation_update(
    metadata_id: int,
    payload: MetadataUpdate,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    return svc_update_metadata(metadata_id, payload, db, redis_cli, user)

@router.delete("/delete/{metadata_id}")
def federation_delete(
    metadata_id: int,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin"])),
):
    return svc_delete_metadata(metadata_id, db, redis_cli, user)

federation_router = router