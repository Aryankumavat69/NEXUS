from pydantic import BaseModel, ConfigDict, Field


class DocumentCreate(BaseModel):
    company_id: int = Field(gt=0)
    document_type: str = Field(min_length=2, max_length=50)
    title: str = Field(min_length=2, max_length=255)
    file_name: str = Field(min_length=1, max_length=255)
    file_path: str = Field(min_length=1, max_length=500)
    mime_type: str = Field(min_length=2, max_length=100)


class DocumentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version_number: int
    extracted_text: str | None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    document_type: str
    title: str
    file_name: str
    file_path: str
    mime_type: str
    status: str
    versions: list[DocumentVersionResponse] = []