from pydantic import BaseModel


class PaymentRiskResponse(BaseModel):
    payment_id: int
    amount: float
    risk_score: float
    risk_level: str
    reasons: list[str]
    requires_human_approval: bool = True