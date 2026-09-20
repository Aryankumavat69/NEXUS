import re

from pydantic import BaseModel, Field, field_validator


class ProductCreate(BaseModel):
    company_id: int = Field(gt=0)

    sku: str = Field(
        min_length=2,
        max_length=100,
    )

    name: str = Field(
        min_length=2,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    category: str = Field(
        min_length=2,
        max_length=100,
    )

    unit: str = Field(
        default="UNIT",
        min_length=1,
        max_length=30,
    )

    unit_price: float = Field(
        default=0,
        ge=0,
    )

    currency: str = Field(
        default="INR",
        min_length=3,
        max_length=3,
    )

    @field_validator("sku")
    @classmethod
    def validate_sku(cls, value: str) -> str:
        value = value.strip().upper()

        if not re.fullmatch(r"[A-Z0-9][A-Z0-9._-]{1,99}", value):
            raise ValueError(
                "SKU may contain only letters, numbers, dots, underscores and hyphens."
            )

        return value

    @field_validator("name", "category", "unit")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Value cannot be empty.")

        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        value = value.strip().upper()

        if not re.fullmatch(r"[A-Z]{3}", value):
            raise ValueError("Currency must be a 3-letter ISO-style code.")

        return value


class ProductResponse(BaseModel):
    id: int
    company_id: int
    sku: str
    name: str
    description: str | None
    category: str
    unit: str
    unit_price: float
    currency: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }