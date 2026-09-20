from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    invoice_id: int = Field(gt=0)
    amount: Decimal = Field(gt=0)
    currency: str = "INR"
    payment_method: str = Field(min_length=2, max_length=30)
    reference: str | None = Field(default=None, max_length=100)


class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    amount: Decimal
    currency: str
    payment_method: str
    status: str
    reference: str | None


class ReceiptResponse(BaseModel):
    id: int
    payment_id: int
    receipt_number: str
    amount: Decimal
    currency: str