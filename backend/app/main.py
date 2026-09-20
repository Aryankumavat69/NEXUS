from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine
from app.db.redis import redis_client

from app.api import embeddings
from app.api import search
from app.api.ai import router as ai_router

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.companies import router as companies_router
from app.api.customers import router as customers_router
from app.api.suppliers import router as suppliers_router
from app.api.products import router as products_router
from app.api.warehouses import router as warehouses_router
from app.api.inventory import router as inventory_router
from app.api.sales_orders import router as sales_orders_router
from app.api.purchase_orders import router as purchase_orders_router
from app.api.goods_receipts import router as goods_receipts_router
from app.api.billing import router as billing_router
from app.api.shipments import router as shipments_router
from app.api.documents import router as documents_router
from app.api import forecasting
from app.api import anomaly
from app.api import payment_risk
from app.api import shipment_intelligence
from app.api import decision_engine 
from app.api import knowledge_graph
from app.api import events
app = FastAPI(
    title="NEXUS API",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(companies_router)
app.include_router(customers_router)
app.include_router(suppliers_router)
app.include_router(products_router)
app.include_router(warehouses_router)
app.include_router(inventory_router)
app.include_router(sales_orders_router)
app.include_router(purchase_orders_router)
app.include_router(goods_receipts_router)
app.include_router(billing_router)
app.include_router(shipments_router)
app.include_router(documents_router)
app.include_router(search.router)
app.include_router(embeddings.router)
app.include_router(ai_router)
app.include_router(forecasting.router)
app.include_router(anomaly.router)
app.include_router(payment_risk.router)
app.include_router(shipment_intelligence.router)
app.include_router(decision_engine.router)
app.include_router(knowledge_graph.router)
app.include_router(events.router)
@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/health")
def health():
    postgres_status = "offline"
    redis_status = "offline"

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            postgres_status = "online"
    except Exception:
        pass

    try:
        redis_client.ping()
        redis_status = "online"
    except Exception:
        pass

    overall_status = (
        "healthy"
        if postgres_status == "online"
        and redis_status == "online"
        else "degraded"
    )

    return {
        "status": overall_status,
        "services": {
            "postgresql": postgres_status,
            "redis": redis_status,
        },
    }
