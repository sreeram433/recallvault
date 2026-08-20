from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import LoginBody, RegisterBody, TokenResponse
from app.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterBody, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == body.email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists")
    user = User(
        email=body.email.lower(),
        display_name=body.display_name.strip() or "You",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.flush()
    return TokenResponse(token=create_token(user.id), user_id=user.id, display_name=user.display_name)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginBody, request: Request, db: Session = Depends(get_db)):
    del request
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return TokenResponse(token=create_token(user.id), user_id=user.id, display_name=user.display_name)
