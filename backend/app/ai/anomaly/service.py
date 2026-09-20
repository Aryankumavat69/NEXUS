from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sales_order import SalesOrder
from app.ai.anomaly.model import detect_anomalies


def analyze_sales_orders(
    db: Session,
    company_id: int | None = None,
) -> list[dict]:

    statement = select(SalesOrder).order_by(
        SalesOrder.created_at.asc()
    )

    if company_id is not None:
        statement = statement.where(
            SalesOrder.company_id == company_id
        )

    orders = db.execute(statement).scalars().all()

    if not orders:
        return []

    values = [
        float(order.total_amount)
        for order in orders
    ]

    analysis = detect_anomalies(values)

    results = []

    for order, result in zip(orders, analysis):

        score = result["anomaly_score"]

        if score >= 0.80:
            severity = "CRITICAL"
        elif score >= 0.60:
            severity = "HIGH"
        elif score >= 0.40:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        results.append(
            {
                "entity_type": "SALES_ORDER",
                "entity_id": order.id,
                "anomaly_score": score,
                "severity": severity,
                "is_anomaly": result["is_anomaly"],
                "reason": (
                    f"Sales order amount "
                    f"{float(order.total_amount):.2f} "
                    f"was identified as unusual compared "
                    f"with the available order history."
                    if result["is_anomaly"]
                    else
                    "Sales order amount is within the "
                    "expected statistical pattern."
                ),
                "requires_human_approval": result["is_anomaly"],
            }
        )

    return results