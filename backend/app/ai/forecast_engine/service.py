from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sales_order import SalesOrder, SalesOrderItem
from app.ai.forecast_engine.model import forecast_demand


def get_product_demand_history(
    db: Session,
    product_id: int,
    historical_days: int = 90,
) -> list[dict]:

    if product_id <= 0:
        raise ValueError("product_id must be greater than 0.")

    if historical_days < 1:
        raise ValueError("historical_days must be greater than 0.")

    start_date = datetime.utcnow() - timedelta(days=historical_days)

    statement = (
        select(
            SalesOrder.created_at,
            SalesOrderItem.quantity,
        )
        .join(
            SalesOrderItem,
            SalesOrderItem.order_id == SalesOrder.id,
        )
        .where(
            SalesOrderItem.product_id == product_id,
            SalesOrder.created_at >= start_date,
            SalesOrder.status.in_(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]),
        )
        .order_by(SalesOrder.created_at.asc())
    )

    rows = db.execute(statement).all()

    return [
        {
            "date": row.created_at,
            "quantity": float(row.quantity),
        }
        for row in rows
    ]


def generate_product_forecast(
    db: Session,
    product_id: int,
    historical_days: int = 90,
    forecast_days: int = 30,
) -> dict:

    history = get_product_demand_history(
        db=db,
        product_id=product_id,
        historical_days=historical_days,
    )

    total_demand = sum(
        float(item["quantity"])
        for item in history
    )

    average_daily = (
        total_demand / historical_days
        if historical_days > 0
        else 0.0
    )

    forecast, method = forecast_demand(
    demand_data=history,
    forecast_days=forecast_days,
    historical_days=historical_days,
    )

    return {
        "product_id": product_id,
        "historical_days": historical_days,
        "total_historical_demand": round(total_demand, 2),
        "average_daily_demand": round(average_daily, 4),
        "forecast_days": forecast_days,
        "forecast_demand": forecast,
        "method": method,
    }
