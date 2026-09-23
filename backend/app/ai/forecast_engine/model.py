from __future__ import annotations

import pandas as pd
from sklearn.linear_model import LinearRegression


def forecast_demand(
    demand_data: list[dict],
    forecast_days: int,
    historical_days: int = 90,
) -> tuple[float, str]:

    if forecast_days < 1:
        raise ValueError("forecast_days must be greater than 0.")

    if historical_days < 1:
        raise ValueError("historical_days must be greater than 0.")

    if not demand_data:
        return 0.0, "NO_HISTORY"

    df = pd.DataFrame(demand_data)

    if df.empty:
        return 0.0, "NO_HISTORY"

    df["date"] = pd.to_datetime(df["date"])
    df["quantity"] = pd.to_numeric(
        df["quantity"],
        errors="coerce",
    ).fillna(0.0)

    daily = (
        df.groupby(
            df["date"].dt.normalize(),
            as_index=False,
        )["quantity"]
        .sum()
        .sort_values("date")
    )

    if daily.empty:
        return 0.0, "NO_HISTORY"

    # ---------------------------------------------------------
    # SINGLE DATA POINT
    # ---------------------------------------------------------
    # If only one demand date exists, do NOT assume that
    # quantity occurred every day.
    #
    # Example:
    # 2 units over 90 historical days
    # average daily demand = 2 / 90
    # 30-day forecast = 0.67
    # ---------------------------------------------------------

    if len(daily) == 1:
        total_demand = float(daily["quantity"].sum())

        average_daily_demand = (
            total_demand / historical_days
        )

        forecast = (
            average_daily_demand * forecast_days
        )

        return (
            round(max(0.0, forecast), 2),
            "SINGLE_POINT_AVERAGE",
        )

    # ---------------------------------------------------------
    # MULTIPLE DATA POINTS
    # ---------------------------------------------------------

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

    predictions = model.predict(
        future_indices
    )

    forecast = float(predictions.sum())

    if forecast < 0:
        forecast = 0.0

    return (
        round(forecast, 2),
        "LINEAR_REGRESSION",
    )