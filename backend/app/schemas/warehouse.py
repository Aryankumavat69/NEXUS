from pydantic import BaseModel, Field, field_validator


class WarehouseCreate(BaseModel):
    company_id: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=50)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Warehouse name cannot be empty.")

        return value

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        value = value.strip().upper()

        if not value.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Invalid warehouse code.")

        return value


class WarehouseResponse(BaseModel):
    id: int
    company_id: int
    name: str
    code: str
    address: str | None
    is_active: bool

    model_config = {
        "from_attributes": True
    }