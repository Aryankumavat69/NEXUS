from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AIHealthResponse(BaseModel):
    status: str
    service: str
    version: str


class AIRequest(BaseModel):
    request_id: UUID | None = None


class AIResponse(BaseModel):
    request_id: UUID
    ai_module: str
    status: str
    confidence: float = Field(ge=0.0, le=1.0)
    recommendation: str
    reasoning: list[str] = Field(default_factory=list)
    data: dict[str, Any] = Field(default_factory=dict)
    requires_human_approval: bool = False


class RAGRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    company_id: int | None = Field(default=None, gt=0)
    top_k: int = Field(default=5, ge=1, le=20)


class RAGSource(BaseModel):
    document_id: int
    document_title: str
    document_type: str
    chunk_id: int
    chunk_index: int
    similarity: float


class RAGResponse(BaseModel):
    request_id: UUID
    ai_module: str
    status: str
    confidence: float = Field(ge=0.0, le=1.0)
    answer: str
    sources: list[RAGSource] = Field(default_factory=list)
    retrieved_chunks: int
    requires_human_approval: bool = False