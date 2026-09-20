from __future__ import annotations


def calculate_overall_risk(
    risk_scores: list[float],
) -> float:

    if not risk_scores:
        return 0.0

    return round(
        sum(risk_scores) / len(risk_scores),
        2,
    )


def determine_risk_level(
    score: float,
) -> str:

    if score >= 80:
        return "CRITICAL"

    if score >= 60:
        return "HIGH"

    if score >= 30:
        return "MEDIUM"

    return "LOW"


def generate_decision(
    risk_level: str,
    reasons: list[str],
) -> str:

    if risk_level == "CRITICAL":
        return (
            "Immediate human intervention is required "
            "before proceeding with the affected operation."
        )

    if risk_level == "HIGH":
        return (
            "Operational review is required before "
            "the affected operation proceeds."
        )

    if risk_level == "MEDIUM":
        return (
            "The operation should be monitored and "
            "reviewed by the responsible team."
        )

    return (
        "No immediate intervention is required. "
        "Continue normal operational monitoring."
    )