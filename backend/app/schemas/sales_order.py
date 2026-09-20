from pydantic import BaseModel, Field, field_validator


class SalesOrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)


class SalesOrderCreate(BaseModel):
    company_id: int = Field(gt=0)
    customer_id: int = Field(gt=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)

    items: list[SalesOrderItemCreate] = Field(
        min_length=1,
        max_length=100,
    )

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        return value.strip().upper()


class SalesOrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    line_total: float

    model_config = {
        "from_attributes": True,
    }


class SalesOrderResponse(BaseModel):
    id: int
    company_id: int
    customer_id: int
    order_number: str
    status: str
    currency: str
    total_amount: float
    items: list[SalesOrderItemResponse]

    model_config = {
        "from_attributes": True,
    }