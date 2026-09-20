from pydantic import BaseModel


class AIDecisionResponse(BaseModel):
    entity_type: str
    entity_id: int
    overall_risk_score: float
    risk_level: str
    decision: str
    reasons: list[str]
    contributing_modules: list[str]
    requires_human_approval: bool