from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import redis
from jose import JWTError, jwt

from ..dependencies import get_db, get_redis
from ..models import Metadata
from ..schemas import MetadataCreate, MetadataUpdate, MetadataResponse

# Shared CRUD service (handles catalog sync, cache, audit, events)
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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return role_checker

# ------------------- CREATE -------------------
@router.post("/", response_model=MetadataResponse)
def create_metadata(
    payload: MetadataCreate,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    return svc_create_metadata(payload, db, redis_cli, user)

# ------------------- LIST -------------------
@router.get("/", response_model=list[MetadataResponse])
def list_metadata(
    db: Session = Depends(get_db),
    user=Depends(require_role(["Admin", "Engineer", "Viewer"])),
):
    return db.query(Metadata).all()

# ------------------- GET BY ID -------------------
@router.get("/{metadata_id}", response_model=MetadataResponse)
def get_metadata(
    metadata_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["Admin", "Engineer", "Viewer"])),
):
    meta = db.query(Metadata).filter(Metadata.id == metadata_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Metadata not found")
    return meta

# ------------------- UPDATE -------------------
@router.put("/{metadata_id}", response_model=MetadataResponse)
def update_metadata(
    metadata_id: int,
    payload: MetadataUpdate,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin", "Engineer"])),
):
    try:
        return svc_update_metadata(metadata_id, payload, db, redis_cli, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")

# ------------------- DELETE -------------------
@router.delete("/{metadata_id}")
def delete_metadata(
    metadata_id: int,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin"])),
):
    try:
        return svc_delete_metadata(metadata_id, db, redis_cli, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="Metadata not found")