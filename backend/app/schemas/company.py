import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class CompanyCreate(BaseModel):
    legal_name: str = Field(min_length=2, max_length=200)
    trade_name: str | None = Field(default=None, max_length=200)
    company_type: str = Field(min_length=2, max_length=50)
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    tax_identifier: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)

    @field_validator("legal_name", "trade_name", "company_type")
    @classmethod
    def validate_text(cls, value):
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value

    @field_validator("country_code")
    @classmethod
    def validate_country(cls, value):
        value = value.strip().upper()

        if not re.fullmatch(r"[A-Z]{2}", value):
            raise ValueError("Country code must contain exactly 2 letters.")

        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value):
        if value is None:
            return value

        value = value.strip()

        if value.startswith("+91"):
            digits = value[3:]
            if not re.fullmatch(r"[6-9]\d{9}", digits):
                raise ValueError("Invalid Indian mobile number.")
            return f"+91{digits}"

        return value


class CompanyResponse(BaseModel):
    id: int
    legal_name: str
    trade_name: str | None
    company_type: str
    country_code: str
    tax_identifier: str | None
    email: str | None
    phone: str | None
    website: str | None
    is_active: bool

    model_config = {
        "from_attributes": True
    }