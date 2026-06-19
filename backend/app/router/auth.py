from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import jwt
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()

# JWT settings
SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Demo users
fake_users_db = {
    "admin": {
        "username": "admin",
        "password": "admin123",
        "role": "Admin"
    },
    "engineer": {
        "username": "engineer",
        "password": "engineer123",
        "role": "Engineer"
    },
    "viewer": {
        "username": "viewer",
        "password": "viewer123",
        "role": "Viewer"
    }
}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def authenticate(username: str, password: str):
    user = fake_users_db.get(username)

    if not user:
        return None

    if user["password"] != password:
        return None

    return user


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
):
    user = authenticate(
        form.username,
        form.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = create_access_token(
        {
            "sub": user["username"],
            "role": user["role"],
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# Export expected name
auth_router = router