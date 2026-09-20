from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.anomaly.service import analyze_sales_orders
from app.ai.payment_risk.service import analyze_payment
from app.ai.shipment_intelligence.service import analyze_shipment
from app.ai.decision_engine.model import (
    calculate_overall_risk,
    determine_risk_level,
    generate_decision,
)


def analyze_business_decision(
    db: Session,
    entity_type: str,
    entity_id: int,
) -> dict:

    risk_scores = []
    reasons = []
    modules = []

    if entity_type == "SHIPMENT":

        shipment = analyze_shipment(
            db=db,
            shipment_id=entity_id,
        )

        risk_scores.append(
            float(shipment["delay_risk_score"])
        )

        reasons.extend(shipment["reasons"])
        modules.append("SHIPMENT_INTELLIGENCE")

    elif entity_type == "PAYMENT":

        payment = analyze_payment(
            db=db,
            payment_id=entity_id,
        )

        risk_scores.append(
            float(payment["risk_score"])
        )

        reasons.extend(payment["reasons"])
        modules.append("PAYMENT_RISK")

    elif entity_type == "SALES_ORDER":

        anomalies = analyze_sales_orders(
            db=db,
        )

        matching = [
            item
            for item in anomalies
            if item["entity_id"] == entity_id
        ]

        if not matching:
            raise ValueError(
                f"Sales order {entity_id} not found."
            )

        anomaly = matching[0]

        risk_scores.append(
            float(anomaly["anomaly_score"]) * 100
        )

        reasons.append(
            anomaly["reason"]
        )

        modules.append("ANOMALY_DETECTION")

    else:

        raise ValueError(
            "Unsupported entity_type. "
            "Use SHIPMENT, PAYMENT, or SALES_ORDER."
        )

    overall_score = calculate_overall_risk(
        risk_scores
    )

    risk_level = determine_risk_level(
        overall_score
    )

    decision = generate_decision(
        risk_level=risk_level,
        reasons=reasons,
    )

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "overall_risk_score": overall_score,
        "risk_level": risk_level,
        "decision": decision,
        "reasons": reasons,
        "contributing_modules": modules,
        "requires_human_approval": overall_score >= 60,
    }