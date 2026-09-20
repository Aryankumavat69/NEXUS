from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.product import Product
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.shipment import Container, Shipment, ShipmentItem
from app.schemas.shipment import (
    ContainerCreate,
    ContainerResponse,
    ShipmentCreate,
    ShipmentResponse,
)

router = APIRouter(
    prefix="/shipments",
    tags=["Shipments"],
)


@router.post(
    "",
    response_model=ShipmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_shipment(
    payload: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sales_order = db.scalar(
        select(SalesOrder).where(
            SalesOrder.id == payload.sales_order_id
        )
    )

    if not sales_order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found.",
        )

    if sales_order.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Shipment can only be created for a CONFIRMED sales order.",
        )

    existing = db.scalar(
        select(Shipment).where(
            Shipment.sales_order_id == payload.sales_order_id
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A shipment already exists for this sales order.",
        )

    order_items = db.scalars(
        select(SalesOrderItem).where(
            SalesOrderItem.order_id == sales_order.id
        )
    ).all()

    order_item_map = {
        item.product_id: item
        for item in order_items
    }

    for item in payload.items:
        if item.product_id not in order_item_map:
            raise HTTPException(
                status_code=400,
                detail=f"Product {item.product_id} is not part of the sales order.",
            )

        order_item = order_item_map[item.product_id]

        if item.quantity > order_item.quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Shipment quantity {item.quantity} exceeds "
                    f"ordered quantity {order_item.quantity}."
                ),
            )

        product = db.scalar(
            select(Product).where(
                Product.id == item.product_id
            )
        )

        if not product or not product.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Product {item.product_id} is not active.",
            )

    shipment = Shipment(
        sales_order_id=sales_order.id,
        shipment_number=f"TEMP-{uuid4().hex}",
        origin_port=payload.origin_port,
        destination_port=payload.destination_port,
        status="DRAFT",
    )

    db.add(shipment)
    db.flush()

    shipment.shipment_number = f"SH-{shipment.id:06d}"

    for item in payload.items:
        db.add(
            ShipmentItem(
                shipment_id=shipment.id,
                product_id=item.product_id,
                quantity=item.quantity,
            )
        )

    db.commit()
    db.refresh(shipment)

    return shipment


@router.get(
    "",
    response_model=list[ShipmentResponse],
)
def list_shipments(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.scalars(
        select(Shipment).order_by(
            Shipment.id.desc()
        )
    ).all()


@router.get(
    "/{shipment_id}",
    response_model=ShipmentResponse,
)
def get_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shipment = db.scalar(
        select(Shipment).where(
            Shipment.id == shipment_id
        )
    )

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Shipment not found.",
        )

    return shipment


@router.post(
    "/{shipment_id}/book",
    response_model=ShipmentResponse,
)
def book_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shipment = db.scalar(
        select(Shipment).where(
            Shipment.id == shipment_id
        )
    )

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Shipment not found.",
        )

    if shipment.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT shipments can be booked.",
        )

    shipment.status = "BOOKED"

    db.commit()
    db.refresh(shipment)

    return shipment


@router.post(
    "/{shipment_id}/transit",
    response_model=ShipmentResponse,
)
def start_transit(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shipment = db.scalar(
        select(Shipment).where(
            Shipment.id == shipment_id
        )
    )

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Shipment not found.",
        )

    if shipment.status != "BOOKED":
        raise HTTPException(
            status_code=400,
            detail="Shipment must be BOOKED before entering transit.",
        )

    shipment.status = "IN_TRANSIT"

    for container in shipment.containers:
        container.status = "IN_TRANSIT"

    db.commit()
    db.refresh(shipment)

    return shipment


@router.post(
    "/{shipment_id}/deliver",
    response_model=ShipmentResponse,
)
def deliver_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shipment = db.scalar(
        select(Shipment).where(
            Shipment.id == shipment_id
        )
    )

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Shipment not found.",
        )

    if shipment.status != "IN_TRANSIT":
        raise HTTPException(
            status_code=400,
            detail="Shipment must be IN_TRANSIT before delivery.",
        )

    shipment.status = "DELIVERED"

    for container in shipment.containers:
        container.status = "DELIVERED"

    db.commit()
    db.refresh(shipment)

    return shipment


@router.post(
    "/{shipment_id}/containers",
    response_model=ContainerResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_container(
    shipment_id: int,
    payload: ContainerCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    shipment = db.scalar(
        select(Shipment).where(
            Shipment.id == shipment_id
        )
    )

    if not shipment:
        raise HTTPException(
            status_code=404,
            detail="Shipment not found.",
        )

    if shipment.status not in {"DRAFT", "BOOKED"}:
        raise HTTPException(
            status_code=400,
            detail="Containers can only be added before transit.",
        )

    existing = db.scalar(
        select(Container).where(
            Container.container_number == payload.container_number
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Container number already exists.",
        )

    container = Container(
        shipment_id=shipment.id,
        container_number=payload.container_number,
        container_type=payload.container_type.upper(),
        status="LOADED",
    )

    db.add(container)
    db.commit()
    db.refresh(container)

    return container