from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os

from ..dependencies import get_db
from ..schemas import CatalogSuggestion
from ..services.catalog_discovery_service import suggest_catalogs
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
        return {
            "username": payload.get("sub"),
            "role": payload.get("role"),
        }
    except JWTError:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def require_read_role(user=Depends(get_current_user)):
    if user["role"] not in ["Admin", "Engineer", "Viewer"]:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return user


@router.get(
    "/suggest",
    response_model=list[CatalogSuggestion],
)
def catalog_suggest(
    q: str,
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    results = suggest_catalogs(q, db)

    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="CATALOG_DISCOVERY",
    )

    return results