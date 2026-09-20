from datetime import datetime, timezone
from pydantic import BaseModel, Field
from uuid import uuid4


class BusinessEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    entity_type: str
    entity_id: int
    company_id: int | None = None
    payload: dict = Field(default_factory=dict)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )