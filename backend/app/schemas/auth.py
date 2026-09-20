import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()

        if not re.fullmatch(r"[A-Za-z][A-Za-z .'-]{1,99}", value):
            raise ValueError("Full name contains invalid characters.")

        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()

        # Accept 10-digit Indian numbers or +91XXXXXXXXXX
        if value.startswith("+91"):
            digits = value[3:]
        else:
            digits = value

        if not re.fullmatch(r"[6-9]\d{9}", digits):
            raise ValueError(
                "Enter a valid Indian mobile number."
            )

        return f"+91{digits}"

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain an uppercase letter.")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain a lowercase letter.")

        if not re.search(r"\d", value):
            raise ValueError("Password must contain a number.")

        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError(
                "Password must contain a special character."
            )

        return value