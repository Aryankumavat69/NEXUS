from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.ai.shipment_intelligence.service import analyze_shipment
from app.ai.shipment_intelligence.schemas import (
    ShipmentIntelligenceResponse,
)


router = APIRouter(
    prefix="/ai/shipment-intelligence",
    tags=["AI Shipment Intelligence"],
)


@router.get(
    "/{shipment_id}",
    response_model=ShipmentIntelligenceResponse,
)
def shipment_intelligence(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return analyze_shipment(
            db=db,
            shipment_id=shipment_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )