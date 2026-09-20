from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.ai.decision_engine.schemas import (
    AIDecisionResponse,
)

from app.ai.decision_engine.service import (
    analyze_business_decision,
)


router = APIRouter(
    prefix="/ai/decision",
    tags=["AI Decision Engine"],
)


@router.get(
    "/analyze",
    response_model=AIDecisionResponse,
)
def analyze_decision(
    entity_type: str = Query(...),
    entity_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    try:

        return analyze_business_decision(
            db=db,
            entity_type=entity_type.upper(),
            entity_id=entity_id,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )