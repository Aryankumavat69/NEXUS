from typing import Any


def validate_confidence(confidence: float) -> float:
    if not 0.0 <= confidence <= 1.0:
        raise ValueError("AI confidence must be between 0 and 1.")

    return confidence


def validate_ai_result(result: dict[str, Any]) -> dict[str, Any]:
    required_fields = {
        "request_id",
        "ai_module",
        "status",
        "confidence",
        "recommendation",
        "reasoning",
        "data",
        "requires_human_approval",
    }

    missing_fields = required_fields - result.keys()

    if missing_fields:
        raise ValueError(
            f"AI result is missing required fields: {sorted(missing_fields)}"
        )

    validate_confidence(float(result["confidence"]))

    if not isinstance(result["reasoning"], list):
        raise ValueError("AI reasoning must be a list.")

    if not isinstance(result["data"], dict):
        raise ValueError("AI data must be an object.")

    if not isinstance(result["requires_human_approval"], bool):
        raise ValueError("requires_human_approval must be boolean.")

    return result