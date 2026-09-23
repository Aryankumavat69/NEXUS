from __future__ import annotations

from typing import Any

from app.events.publisher import publish_event
from app.events.schemas import BusinessEvent


class EventTypes:
    SALES_ORDER_CONFIRMED = "SALES_ORDER_CONFIRMED"
    PURCHASE_ORDER_CONFIRMED = "PURCHASE_ORDER_CONFIRMED"
    GOODS_RECEIVED = "GOODS_RECEIVED"
    INVOICE_CREATED = "INVOICE_CREATED"
    PAYMENT_CREATED = "PAYMENT_CREATED"
    RECEIPT_CREATED = "RECEIPT_CREATED"


def emit_business_event(
    *,
    event_type: str,
    entity_type: str,
    entity_id: int,
    company_id: int | None = None,
    payload: dict[str, Any] | None = None,
) -> str | None:
    """
    Publish a business event after the corresponding
    database transaction has successfully committed.

    Event publishing is intentionally isolated from the
    business transaction. A Redis outage should not roll
    back a successful business operation.
    """

    event = BusinessEvent(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        company_id=company_id,
        payload=payload or {},
    )

    try:
        return publish_event(event)
    except Exception as exc:
        print(
            f"[NEXUS EVENT WARNING] "
            f"Failed to publish {event_type}: {exc}"
        )
        return None