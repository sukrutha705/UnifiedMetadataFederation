from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import redis
from jose import JWTError, jwt

from ..dependencies import get_db, get_redis
from ..models import Metadata
from ..registry import registry
from ..cache import cache_store, invalidate_cache, rebuild_cache
from ..events import log_event
from ..utils.audit import write_audit
from ..schemas import MetadataCreate, MetadataUpdate, MetadataResponse

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
    meta = Metadata(**payload.dict())
    db.add(meta)
    db.commit()
    db.refresh(meta)

    # Cache handling – invalidate and rebuild for this catalog
    invalidate_cache(redis_cli, meta.catalog_name, meta.id)
    rebuild_cache(redis_cli, db, meta.catalog_name)

    # Audit + timeline
    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CREATE",
        catalog_name=meta.catalog_name,
        metadata_id=meta.id,
    )
    log_event(db, meta.id, "CREATED")
    return meta

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
    meta = db.query(Metadata).filter(Metadata.id == metadata_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Metadata not found")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(meta, field, value)
    db.commit()
    db.refresh(meta)

    invalidate_cache(redis_cli, meta.catalog_name, meta.id)
    rebuild_cache(redis_cli, db, meta.catalog_name)

    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="UPDATE",
        catalog_name=meta.catalog_name,
        metadata_id=meta.id,
    )
    log_event(db, meta.id, "UPDATED")
    return meta

# ------------------- DELETE -------------------
@router.delete("/{metadata_id}")
def delete_metadata(
    metadata_id: int,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_role(["Admin"])),
):
    meta = db.query(Metadata).filter(Metadata.id == metadata_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Metadata not found")

    # Delete core record
    db.delete(meta)
    db.commit()

    # Delete from catalog‑specific table (raw SQL, based on catalog name)
    table_name = (
        "spark_metadata" if meta.catalog_name == "spark" else
        "postgres_metadata" if meta.catalog_name == "postgres" else
        "opensearch_metadata"
    )
    db.execute(f"DELETE FROM {table_name} WHERE id = :mid", {"mid": meta.id})
    db.commit()

    invalidate_cache(redis_cli, meta.catalog_name, meta.id)

    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="DELETE",
        catalog_name=meta.catalog_name,
        metadata_id=meta.id,
    )
    log_event(db, meta.id, "DELETED")
    return {"msg": "metadata deleted"}