import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.redis import redis_client
from app.models.otp import OTPVerification
from app.models.user import User


OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60


def hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_otp(
    db: Session,
    user: User,
    purpose: str,
) -> str:

    cooldown_key = f"nexus:otp:cooldown:{user.id}:{purpose}"

    if redis_client.exists(cooldown_key):
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting another OTP.",
        )

    otp = generate_otp()

    verification = OTPVerification(
        user_id=user.id,
        purpose=purpose,
        otp_hash=hash_otp(otp),
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRY_MINUTES),
        attempts=0,
    )

    db.add(verification)
    db.commit()

    redis_client.setex(
        cooldown_key,
        RESEND_COOLDOWN_SECONDS,
        "1",
    )

    return otp


def verify_otp(
    db: Session,
    user: User,
    purpose: str,
    otp: str,
) -> bool:

    verification = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.user_id == user.id,
            OTPVerification.purpose == purpose,
            OTPVerification.verified_at.is_(None),
        )
        .order_by(OTPVerification.id.desc())
        .first()
    )

    if not verification:
        raise HTTPException(
            status_code=400,
            detail="No active OTP found.",
        )

    now = datetime.now(timezone.utc)

    if now >= verification.expires_at:
        raise HTTPException(
            status_code=400,
            detail="OTP has expired.",
        )

    if verification.attempts >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Maximum OTP attempts exceeded.",
        )

    verification.attempts += 1

    if not secrets.compare_digest(
        verification.otp_hash,
        hash_otp(otp),
    ):
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    verification.verified_at = now

    if purpose == "email_verification":
        user.email_verified = True

    elif purpose == "phone_verification":
        user.phone_verified = True

    db.commit()

    return True