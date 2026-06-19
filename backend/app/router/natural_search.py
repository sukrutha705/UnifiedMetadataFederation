# backend/app/router/natural_search.py

import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import List

from ..dependencies import get_db
from ..schemas import CatalogSuggestion
from ..services.natural_language_search_service import natural_search
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def require_read_role(user=Depends(get_current_user)):
    if user["role"] not in ["Admin", "Engineer", "Viewer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return user


@router.get(
    "/natural",
    response_model=List[CatalogSuggestion],
)
def natural_search_endpoint(
    q: str,
    db: Session = Depends(get_db),
    user=Depends(require_read_role),
):
    results = natural_search(q, db)

    write_audit(
        db,
        username=user["username"],
        role=user["role"],
        action="NATURAL_SEARCH",
    )

    return results