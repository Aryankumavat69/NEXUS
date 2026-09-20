from __future__ import annotations


def calculate_shipment_risk(
    status: str,
    shipment_age_days: int,
    container_count: int,
    in_transit_containers: int,
) -> dict:

    score = 0.0
    reasons = []

    if status == "CANCELLED":
        score = 100.0
        reasons.append("Shipment has been cancelled.")

    elif status == "DELIVERED":
        score = 0.0
        reasons.append("Shipment has already been delivered.")

    else:
        if status == "DRAFT":
            score += 20
            reasons.append("Shipment has not yet been booked.")

        elif status == "BOOKED":
            score += 10
            reasons.append("Shipment is booked but has not entered transit.")

        elif status == "IN_TRANSIT":
            score += 5

        if shipment_age_days > 30:
            score += 30
            reasons.append(
                "Shipment has remained active for more than 30 days."
            )
        elif shipment_age_days > 14:
            score += 15
            reasons.append(
                "Shipment has remained active for more than 14 days."
            )

        if container_count == 0:
            score += 35
            reasons.append(
                "Shipment has no containers assigned."
            )
        elif status == "IN_TRANSIT" and in_transit_containers == 0:
            score += 25
            reasons.append(
                "Shipment is in transit but no container is marked in transit."
            )

    score = min(score, 100.0)

    if score >= 80:
        risk_level = "CRITICAL"
    elif score >= 60:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    if risk_level in {"CRITICAL", "HIGH"}:
        recommendation = (
            "Immediate logistics review is recommended."
        )
    elif risk_level == "MEDIUM":
        recommendation = (
            "Shipment should be monitored and logistics status reviewed."
        )
    else:
        recommendation = (
            "Shipment is currently within expected operational conditions."
        )

    if not reasons:
        reasons.append(
            "No significant shipment risk indicators were detected."
        )

    return {
        "delay_risk_score": round(score, 2),
        "risk_level": risk_level,
        "reasons": reasons,
        "recommendation": recommendation,
        "requires_human_approval": score >= 60,
    }