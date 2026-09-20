from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# =========================================================
# PURCHASE ORDER ITEM
# =========================================================

class PurchaseOrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    unit_price: Decimal = Field(gt=0)


class PurchaseOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    line_total: Decimal


# =========================================================
# PURCHASE ORDER CREATE
# =========================================================

class PurchaseOrderCreate(BaseModel):
    company_id: int = Field(gt=0)
    supplier_id: int = Field(gt=0)
    currency: str = "INR"
    items: list[PurchaseOrderItemCreate] = Field(
        min_length=1,
        max_length=100,
    )

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        value = value.upper()

        if len(value) != 3 or not value.isalpha():
            raise ValueError(
                "Currency must be a valid 3-letter code."
            )

        return value


# =========================================================
# PURCHASE ORDER RESPONSE
# =========================================================

class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    supplier_id: int
    po_number: str
    status: str
    currency: str
    total_amount: Decimal
    items: list[PurchaseOrderItemResponse] = []