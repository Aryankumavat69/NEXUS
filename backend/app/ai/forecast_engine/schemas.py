from pydantic import BaseModel, Field


class DemandForecastResponse(BaseModel):
    product_id: int
    historical_days: int
    total_historical_demand: float
    average_daily_demand: float
    forecast_days: int
    forecast_demand: float
    method: str


class InventoryIntelligenceResponse(BaseModel):
    product_id: int
    current_stock: float
    reserved_stock: float
    available_stock: float
    reorder_level: float
    forecast_demand: float
    forecast_days: int
    risk_level: str
    recommendation: str
    requires_human_approval: bool = False
