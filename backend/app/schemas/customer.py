from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    company_id: int = Field(gt=0)
    customer_code: str = Field(min_length=2, max_length=50)
    customer_status: str = Field(default="ACTIVE", min_length=2, max_length=30)
    credit_limit: float = Field(default=0, ge=0)
    payment_terms_days: int = Field(default=30, ge=0, le=365)

    @classmethod
    def validate_code(cls, value):
        return value.strip().upper()


class CustomerResponse(BaseModel):
    id: int
    company_id: int
    customer_code: str
    customer_status: str
    credit_limit: float
    payment_terms_days: int

    model_config = {
        "from_attributes": True
    }