from __future__ import annotations


def calculate_payment_risk(
    amount: float,
    invoice_amount: float | None,
    allocated_amount: float,
) -> dict:

    score = 0.0
    reasons = []

    if amount <= 0:
        score = 100.0
        reasons.append("Payment amount is invalid.")

    if invoice_amount is not None and amount > invoice_amount:
        score += 70
        reasons.append(
            "Payment amount exceeds the invoice amount."
        )

    if allocated_amount > amount:
        score += 60
        reasons.append(
            "Allocated amount exceeds the payment amount."
        )

    if amount > 1_000_000:
        score += 20
        reasons.append(
            "Payment amount exceeds the configured high-value threshold."
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

    if not reasons:
        reasons.append(
            "Payment passed the configured risk checks."
        )

    return {
        "risk_score": round(score, 2),
        "risk_level": risk_level,
        "reasons": reasons,
        "requires_human_approval": score >= 60,
    }