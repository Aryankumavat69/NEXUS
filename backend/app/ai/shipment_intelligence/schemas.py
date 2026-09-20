from pydantic import BaseModel


class ShipmentIntelligenceResponse(BaseModel):
    shipment_id: int
    shipment_number: str
    status: str
    shipment_age_days: int
    container_count: int
    in_transit_containers: int
    delay_risk_score: float
    risk_level: str
    reasons: list[str]
    recommendation: str
    requires_human_approval: bool = True