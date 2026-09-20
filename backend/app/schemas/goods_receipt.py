from pydantic import BaseModel, ConfigDict, Field


class GoodsReceiptItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    received_quantity: int = Field(gt=0)


class GoodsReceiptItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    received_quantity: int


class GoodsReceiptCreate(BaseModel):
    purchase_order_id: int = Field(gt=0)
    warehouse_id: int = Field(gt=0)
    items: list[GoodsReceiptItemCreate] = Field(
        min_length=1,
        max_length=100,
    )


class GoodsReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    purchase_order_id: int
    warehouse_id: int
    receipt_number: str
    status: str
    items: list[GoodsReceiptItemResponse] = []