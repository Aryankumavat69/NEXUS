from pydantic import BaseModel, Field


class SupplierCreate(BaseModel):
    company_id: int = Field(gt=0)
    supplier_code: str = Field(min_length=2, max_length=50)
    supplier_status: str = Field(
        default="ACTIVE",
        min_length=2,
        max_length=30,
    )
    payment_terms_days: int = Field(
        default=30,
        ge=0,
        le=365,
    )
    supplier_rating: float | None = Field(
        default=None,
        ge=0,
        le=5,
    )


class SupplierResponse(BaseModel):
    id: int
    company_id: int
    supplier_code: str
    supplier_status: str
    payment_terms_days: int
    supplier_rating: float | None

    model_config = {
        "from_attributes": True
    }