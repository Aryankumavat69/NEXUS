from __future__ import annotations

import numpy as np
from sklearn.ensemble import IsolationForest


def detect_anomalies(values: list[float]) -> list[dict]:
    if not values:
        return []

    if len(values) < 5:
        return [
            {
                "value": value,
                "anomaly_score": 0.0,
                "is_anomaly": False,
            }
            for value in values
        ]

    data = np.array(values, dtype=float).reshape(-1, 1)

    model = IsolationForest(
        contamination="auto",
        random_state=42,
    )

    predictions = model.fit_predict(data)
    scores = model.decision_function(data)

    results = []

    for value, prediction, score in zip(
        values,
        predictions,
        scores,
    ):
        anomaly_score = max(
            0.0,
            min(1.0, (0.5 - float(score)) * 2),
        )

        results.append(
            {
                "value": value,
                "anomaly_score": round(anomaly_score, 4),
                "is_anomaly": prediction == -1,
            }
        )

    return results