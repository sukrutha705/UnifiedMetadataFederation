from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import redis
from jose import JWTError, jwt

from ..dependencies import get_db, get_redis
from ..registry import registry
from ..cache import get_federation_cache, set_federation_cache
from ..utils.audit import write_audit
from ..schemas import FederationSearchResponse, FederationResult

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(
            token,
            "supersecretkey",
            algorithms=["HS256"]
        )

        return {
            "username": payload.get("sub"),
            "role": payload.get("role")
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def require_read_role(user=Depends(get_current_user)):
    if user["role"] not in ["Admin", "Engineer", "Viewer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    return user


@router.get(
    "/search",
    response_model=FederationSearchResponse
)
def federation_search(
    q: str,
    db: Session = Depends(get_db),
    redis_cli: redis.Redis = Depends(get_redis),
    user=Depends(require_read_role),
):
    # Check cache first
    cached = get_federation_cache(redis_cli, q)

    if cached:
        write_audit(
            db,
            username=user["username"],
            role=user["role"],
            action="CACHE_HIT",
        )

        return FederationSearchResponse(**cached)

    # Query all registered catalogs
    results = []

    for catalog_name in registry.list_catalogs():
        adapter = registry.get_catalog(catalog_name)

        try:
            catalog_results = adapter.search(db, q)

            for item in catalog_results:
                results.append(
                    FederationResult(
                        catalog=item["catalog"],
                        object_name=item["object_name"]
                    )
                )

        except Exception as e:
            print(f"Catalog search failed for {catalog_name}: {e}")

    response = FederationSearchResponse(
        query=q,
        results=results
    )

    # Store in cache
    set_federation_cache(
        redis_cli,
        q,
        response.model_dump()
    )

    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CACHE_MISS",
    )

    return response


federation_router = router