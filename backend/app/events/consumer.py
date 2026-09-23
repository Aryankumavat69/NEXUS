from __future__ import annotations

import json
import time

from app.events.publisher import (
    EVENT_STREAM,
    get_redis,
)


def handle_event(event: dict) -> None:
    event_type = event.get(
        "event_type",
        "UNKNOWN",
    )

    entity_type = event.get(
        "entity_type",
        "UNKNOWN",
    )

    entity_id = event.get(
        "entity_id",
        "UNKNOWN",
    )

    payload = event.get(
        "payload",
        {},
    )

    print()
    print("=" * 70)
    print("[NEXUS EVENT RECEIVED]")
    print("=" * 70)

    print(f"Event ID      : {event.get('event_id')}")
    print(f"Event Type    : {event_type}")
    print(f"Entity        : {entity_type}:{entity_id}")
    print(f"Company ID    : {event.get('company_id')}")
    print(f"Timestamp     : {event.get('timestamp')}")
    print(f"Payload       : {payload}")

    if event_type == "SALES_ORDER_CONFIRMED":
        handle_sales_order_confirmed(event)

    elif event_type == "PURCHASE_ORDER_CONFIRMED":
        handle_purchase_order_confirmed(event)

    elif event_type == "GOODS_RECEIVED":
        handle_goods_received(event)

    elif event_type == "INVOICE_CREATED":
        handle_invoice_created(event)

    elif event_type == "PAYMENT_CREATED":
        handle_payment_created(event)

    elif event_type == "RECEIPT_CREATED":
        handle_receipt_created(event)

    else:
        print(
            f"[NEXUS EVENT] No handler registered "
            f"for {event_type}"
        )

    print("=" * 70)


def handle_sales_order_confirmed(
    event: dict,
) -> None:
    payload = event.get("payload", {})

    print(
        "[NEXUS HANDLER] "
        f"Sales order {payload.get('order_number')} "
        "confirmed."
    )

    print(
        "[NEXUS HANDLER] "
        "Inventory reservation has been completed."
    )


def handle_purchase_order_confirmed(
    event: dict,
) -> None:
    payload = event.get("payload", {})

    print(
        "[NEXUS HANDLER] "
        f"Purchase order {payload.get('po_number')} "
        "confirmed."
    )


def handle_goods_received(
    event: dict,
) -> None:
    payload = event.get("payload", {})

    print(
        "[NEXUS HANDLER] "
        f"Goods receipt "
        f"{payload.get('receipt_number')} processed."
    )

    print(
        "[NEXUS HANDLER] "
        f"Received quantity: "
        f"{payload.get('total_received')}"
    )


def handle_invoice_created(
    event: dict,
) -> None:
    payload = event.get("payload", {})

    print(
        "[NEXUS HANDLER] "
        f"Invoice {payload.get('invoice_number')} "
        "created."
    )

    print(
        "[NEXUS HANDLER] "
        f"Invoice total: "
        f"{payload.get('total_amount')} "
        f"{payload.get('currency')}"
    )


def handle_payment_created(
    event: dict,
) -> None:
    payload = event.get("payload", {})

    print(
        "[NEXUS HANDLER] "
        f"Payment {payload.get('payment_number')} "
        "created."
    )

    print(
        "[NEXUS HANDLER] "
        f"Payment amount: "
        f"{payload.get('amount')} "
        f"{payload.get('currency')}"
    )

    print(
        "[NEXUS HANDLER] "
        "Payment risk analysis can now be triggered."
    )


def handle_receipt_created(
    event: dict,
) -> None:
    payload = event.get("payload", {})

    print(
        "[NEXUS HANDLER] "
        f"Receipt {payload.get('receipt_number')} "
        "created."
    )


def consume_events() -> None:
    client = get_redis()

    last_id = "0-0"

    print()
    print("=" * 70)
    print("NEXUS EVENT CONSUMER")
    print("=" * 70)
    print(f"Stream: {EVENT_STREAM}")
    print("Status: LISTENING")
    print("=" * 70)

    while True:
        try:
            messages = client.xread(
                {EVENT_STREAM: last_id},
                block=5000,
                count=10,
            )

            if not messages:
                continue

            for _, entries in messages:
                for event_id, data in entries:
                    try:
                        event = json.loads(
                            data["event"]
                        )

                        handle_event(event)

                    except Exception as exc:
                        print(
                            "[NEXUS EVENT ERROR] "
                            f"Processing failed: {exc}"
                        )

                    finally:
                        last_id = event_id

        except Exception as exc:
            print(
                "[NEXUS REDIS ERROR] "
                f"{exc}"
            )

            time.sleep(2)


if __name__ == "__main__":
    consume_events()