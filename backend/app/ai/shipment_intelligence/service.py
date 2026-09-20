from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.shipment import Shipment
from app.ai.shipment_intelligence.model import calculate_shipment_risk


def analyze_shipment(
    db: Session,
    shipment_id: int,
) -> dict:

    shipment = db.get(Shipment, shipment_id)

    if not shipment:
        raise ValueError(
            f"Shipment {shipment_id} not found."
        )

    now = datetime.now(timezone.utc)

    created_at = shipment.created_at

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    shipment_age_days = max(
        0,
        (now - created_at).days,
    )

    container_count = len(shipment.containers)

    in_transit_containers = sum(
        1
        for container in shipment.containers
        if container.status == "IN_TRANSIT"
    )

    risk = calculate_shipment_risk(
        status=shipment.status,
        shipment_age_days=shipment_age_days,
        container_count=container_count,
        in_transit_containers=in_transit_containers,
    )

    return {
        "shipment_id": shipment.id,
        "shipment_number": shipment.shipment_number,
        "status": shipment.status,
        "shipment_age_days": shipment_age_days,
        "container_count": container_count,
        "in_transit_containers": in_transit_containers,
        **risk,
    }