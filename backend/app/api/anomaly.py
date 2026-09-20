from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.ai.anomaly.service import analyze_sales_orders

router = APIRouter(
    prefix="/ai/anomaly",
    tags=["AI Anomaly Detection"],
)


@router.get("/sales-orders")
def sales_order_anomalies(
    company_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return {
        "module": "ANOMALY_DETECTION",
        "entity": "SALES_ORDER",
        "results": analyze_sales_orders(
            db=db,
            company_id=company_id,
        ),
    }