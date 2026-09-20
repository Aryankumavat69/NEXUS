from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.db.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.schemas.login import LoginRequest, TokenResponse
from app.schemas.otp import SendOTPRequest, VerifyOTPRequest
from app.services.otp_service import create_otp, verify_otp


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_email = (
        db.query(User)
        .filter(User.email == request.email.lower())
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered.",
        )

    existing_phone = (
        db.query(User)
        .filter(User.phone == request.phone)
        .first()
    )

    if existing_phone:
        raise HTTPException(
            status_code=409,
            detail="Phone number is already registered.",
        )

    default_role = (
        db.query(Role)
        .filter(Role.name == "CUSTOMER")
        .first()
    )

    if not default_role:
        raise HTTPException(
            status_code=500,
            detail="Default CUSTOMER role is not configured.",
        )

    user = User(
        full_name=request.full_name,
        email=request.email.lower(),
        phone=request.phone,
        password_hash=hash_password(request.password),
        role_id=default_role.id,
        email_verified=False,
        phone_verified=False,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful. Verification required.",
        "user_id": user.id,
        "email": user.email,
        "phone": user.phone,
        "role": default_role.name,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == request.email.lower())
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive.",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not user.email_verified or not user.phone_verified:
        raise HTTPException(
            status_code=403,
            detail="Email and phone verification required.",
        )

    role = (
        db.query(Role)
        .filter(Role.id == user.role_id)
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=500,
            detail="User role is not configured.",
        )

    token = create_access_token(
        user_id=user.id,
        role=role.name,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/otp/send")
def send_otp(
    request: SendOTPRequest,
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    otp = create_otp(
        db=db,
        user=user,
        purpose=request.purpose,
    )

    return {
        "message": "OTP generated successfully.",
        "development_otp": otp,
        "expires_in_minutes": 5,
    }


@router.post("/otp/verify")
def verify_user_otp(
    request: VerifyOTPRequest,
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    verify_otp(
        db=db,
        user=user,
        purpose=request.purpose,
        otp=request.otp,
    )

    return {
        "message": f"{request.purpose} verified successfully.",
    }