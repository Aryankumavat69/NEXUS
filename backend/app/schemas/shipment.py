from pydantic import BaseModel, ConfigDict, Field


class ShipmentItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class ShipmentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int


class ContainerCreate(BaseModel):
    container_number: str = Field(min_length=5, max_length=50)
    container_type: str = "40HC"


class ContainerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shipment_id: int
    container_number: str
    container_type: str
    status: str


class ShipmentCreate(BaseModel):
    sales_order_id: int = Field(gt=0)
    origin_port: str = Field(min_length=2, max_length=100)
    destination_port: str = Field(min_length=2, max_length=100)
    items: list[ShipmentItemCreate] = Field(
        min_length=1,
        max_length=100,
    )


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sales_order_id: int
    shipment_number: str
    origin_port: str
    destination_port: str
    status: str
    items: list[ShipmentItemResponse] = []
    containers: list[ContainerResponse] = []