from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.ai.payment_risk.service import analyze_payment

router = APIRouter(
    prefix="/ai/payment-risk",
    tags=["AI Payment Risk"],
)


@router.get(
    "/{payment_id}",
)
def payment_risk(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return analyze_payment(
            db=db,
            payment_id=payment_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )