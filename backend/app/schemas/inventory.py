from typing import Literal

from pydantic import BaseModel, Field


class InventoryCreate(BaseModel):
    warehouse_id: int = Field(gt=0)
    product_id: int = Field(gt=0)
    reorder_level: int = Field(default=10, ge=0)


class InventoryResponse(BaseModel):
    id: int
    warehouse_id: int
    product_id: int
    quantity: int
    reserved_quantity: int
    reorder_level: int

    model_config = {
        "from_attributes": True,
    }


class StockMovementRequest(BaseModel):
    warehouse_id: int = Field(gt=0)
    product_id: int = Field(gt=0)

    movement_type: Literal[
        "STOCK_IN",
        "STOCK_OUT",
        "ADJUSTMENT",
    ]

    quantity: int = Field(gt=0)

    reference_type: str | None = Field(
        default=None,
        max_length=50,
    )

    reference_id: int | None = Field(
        default=None,
        gt=0,
    )

    notes: str | None = Field(
        default=None,
        max_length=500,
    )


class StockMovementResponse(BaseModel):
    inventory_id: int
    movement_type: str
    quantity: int
    current_quantity: int
    low_stock: bool