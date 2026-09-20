from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.ai.forecast_engine.service import generate_product_forecast


def generate_inventory_intelligence(
    db: Session,
    product_id: int,
    warehouse_id: int | None = None,
    forecast_days: int = 30,
) -> dict:

    statement = select(Inventory).where(
        Inventory.product_id == product_id
    )

    if warehouse_id is not None:
        statement = statement.where(
            Inventory.warehouse_id == warehouse_id
        )

    inventory_rows = db.execute(statement).scalars().all()

    if not inventory_rows:
        raise ValueError(
            f"No inventory found for product {product_id}."
        )

    current_stock = sum(
        float(row.quantity)
        for row in inventory_rows
    )

    reserved_stock = sum(
        float(row.reserved_quantity)
        for row in inventory_rows
    )

    available_stock = current_stock - reserved_stock

    reorder_level = max(
        float(row.reorder_level)
        for row in inventory_rows
    )

    forecast = generate_product_forecast(
        db=db,
        product_id=product_id,
        forecast_days=forecast_days,
    )

    forecast_demand = forecast["forecast_demand"]

    if available_stock <= 0:
        risk_level = "CRITICAL"
        recommendation = (
            "Available inventory is depleted. "
            "Immediate replenishment should be reviewed."
        )

    elif available_stock <= reorder_level:
        risk_level = "HIGH"
        recommendation = (
            "Available inventory is at or below the "
            "configured reorder level. Replenishment "
            "should be reviewed."
        )

    elif available_stock < forecast_demand:
        risk_level = "MEDIUM"
        recommendation = (
            "Available inventory is below forecast demand "
            "for the selected forecast period. Additional "
            "supply should be evaluated."
        )

    else:
        risk_level = "LOW"
        recommendation = (
            "Available inventory is currently sufficient "
            "for the selected forecast period."
        )

    return {
        "product_id": product_id,
        "current_stock": round(current_stock, 2),
        "reserved_stock": round(reserved_stock, 2),
        "available_stock": round(available_stock, 2),
        "reorder_level": round(reorder_level, 2),
        "forecast_demand": round(forecast_demand, 2),
        "forecast_days": forecast_days,
        "risk_level": risk_level,
        "recommendation": recommendation,
        "requires_human_approval": False,
    }
