from pydantic import BaseModel


class AnomalyResponse(BaseModel):
    entity_type: str
    entity_id: int
    anomaly_score: float
    severity: str
    is_anomaly: bool
    reason: str
    requires_human_approval: bool = True