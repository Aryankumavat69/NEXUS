from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sales_order_id: int
    invoice_number: str
    status: str
    currency: str
    total_amount: Decimal
    paid_amount: Decimal
    items: list[InvoiceItemResponse] = []