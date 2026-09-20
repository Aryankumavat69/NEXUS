from __future__ import annotations

import pandas as pd
from sklearn.linear_model import LinearRegression


def forecast_demand(
    demand_data: list[dict],
    forecast_days: int,
) -> tuple[float, str]:

    if forecast_days < 1:
        raise ValueError("forecast_days must be greater than 0.")

    if not demand_data:
        return 0.0, "NO_HISTORY"

    df = pd.DataFrame(demand_data)

    if df.empty:
        return 0.0, "NO_HISTORY"

    df["date"] = pd.to_datetime(df["date"])
    df["quantity"] = pd.to_numeric(df["quantity"])

    daily = (
        df.groupby("date", as_index=False)["quantity"]
        .sum()
        .sort_values("date")
    )

    if len(daily) == 1:
        average = float(daily["quantity"].iloc[0])
        return round(max(0.0, average * forecast_days), 2), "SINGLE_POINT_AVERAGE"

    daily["day_index"] = range(len(daily))

    model = LinearRegression()
    model.fit(
        daily[["day_index"]],
        daily["quantity"],
    )

    future_indices = pd.DataFrame(
        {
            "day_index": range(
                len(daily),
                len(daily) + forecast_days,
            )
        }
    )

    predictions = model.predict(future_indices)

    forecast = float(predictions.sum())

    if forecast < 0:
        forecast = 0.0

    return round(forecast, 2), "LINEAR_REGRESSION"
