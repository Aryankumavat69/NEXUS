from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.ai.forecast_engine.schemas import (
    DemandForecastResponse,
    InventoryIntelligenceResponse,
)

from app.ai.forecast_engine.service import generate_product_forecast
from app.ai.forecast_engine.inventory import generate_inventory_intelligence


router = APIRouter(
    prefix="/ai",
    tags=["AI Forecasting"],
)


@router.get(
    "/forecast/products/{product_id}",
    response_model=DemandForecastResponse,
)
def product_demand_forecast(
    product_id: int,
    historical_days: int = Query(default=90, ge=1, le=3650),
    forecast_days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return generate_product_forecast(
            db=db,
            product_id=product_id,
            historical_days=historical_days,
            forecast_days=forecast_days,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@router.get(
    "/inventory/intelligence/{product_id}",
    response_model=InventoryIntelligenceResponse,
)
def product_inventory_intelligence(
    product_id: int,
    warehouse_id: int | None = Query(default=None, gt=0),
    forecast_days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return generate_inventory_intelligence(
            db=db,
            product_id=product_id,
            warehouse_id=warehouse_id,
            forecast_days=forecast_days,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
