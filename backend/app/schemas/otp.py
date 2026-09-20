from typing import Literal

from pydantic import BaseModel, Field


class SendOTPRequest(BaseModel):
    purpose: Literal[
        "email_verification",
        "phone_verification",
    ]


class VerifyOTPRequest(BaseModel):
    purpose: Literal[
        "email_verification",
        "phone_verification",
    ]

    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )