from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.goods_receipt import GoodsReceipt, GoodsReceiptItem
from app.models.inventory import Inventory
from app.models.inventory_movement import InventoryMovement
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.warehouse import Warehouse
from app.schemas.goods_receipt import (
    GoodsReceiptCreate,
    GoodsReceiptResponse,
)
from app.events.service import (
    EventTypes,
    emit_business_event,
)
router = APIRouter(
    prefix="/goods-receipts",
    tags=["Goods Receipts"],
)


@router.post(
    "",
    response_model=GoodsReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goods_receipt(
    payload: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------
    # Validate Purchase Order
    # -----------------------------
    purchase_order = db.scalar(
        select(PurchaseOrder).where(
            PurchaseOrder.id == payload.purchase_order_id
        )
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found.",
        )

    if purchase_order.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Goods receipt can only be created for a CONFIRMED purchase order.",
        )

    # -----------------------------
    # Validate Warehouse
    # -----------------------------
    warehouse = db.scalar(
        select(Warehouse).where(
            Warehouse.id == payload.warehouse_id
        )
    )

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found.",
        )

    if warehouse.company_id != purchase_order.company_id:
        raise HTTPException(
            status_code=400,
            detail="Warehouse does not belong to the purchase order company.",
        )

    # -----------------------------
    # Load PO items
    # -----------------------------
    po_items = db.scalars(
        select(PurchaseOrderItem).where(
            PurchaseOrderItem.order_id == purchase_order.id
        )
    ).all()

    po_item_map = {
        item.product_id: item
        for item in po_items
    }

    if not po_item_map:
        raise HTTPException(
            status_code=400,
            detail="Purchase order has no items.",
        )

    # -----------------------------
    # Validate received items
    # -----------------------------
    for item in payload.items:

        if item.product_id not in po_item_map:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Product {item.product_id} is not part of "
                    f"purchase order {purchase_order.po_number}."
                ),
            )

        po_item = po_item_map[item.product_id]

        # Check previous receipts
        previous_received = db.scalar(
            select(GoodsReceiptItem.received_quantity)
            .join(
                GoodsReceipt,
                GoodsReceipt.id == GoodsReceiptItem.receipt_id,
            )
            .where(
                GoodsReceipt.purchase_order_id == purchase_order.id,
                GoodsReceiptItem.product_id == item.product_id,
                GoodsReceipt.status == "RECEIVED",
            )
        )

        previous_received = previous_received or 0

        remaining_quantity = (
            po_item.quantity - previous_received
        )

        if item.received_quantity > remaining_quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot receive {item.received_quantity} units "
                    f"of product {item.product_id}. "
                    f"Remaining quantity is {remaining_quantity}."
                ),
            )

    # -----------------------------
    # Create receipt
    # -----------------------------
    receipt = GoodsReceipt(
        purchase_order_id=purchase_order.id,
        warehouse_id=warehouse.id,
        receipt_number=f"TEMP-{uuid4().hex}",
        status="DRAFT",
    )

    db.add(receipt)
    db.flush()

    receipt.receipt_number = f"GR-{receipt.id:06d}"

    # -----------------------------
    # Create receipt items
    # -----------------------------
    for item in payload.items:
        receipt_item = GoodsReceiptItem(
            receipt_id=receipt.id,
            product_id=item.product_id,
            received_quantity=item.received_quantity,
        )

        db.add(receipt_item)

    db.commit()
    db.refresh(receipt)

    return receipt


@router.get(
    "",
    response_model=list[GoodsReceiptResponse],
)
def list_goods_receipts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.scalars(
        select(GoodsReceipt).order_by(
            GoodsReceipt.id.desc()
        )
    ).all()


@router.get(
    "/{receipt_id}",
    response_model=GoodsReceiptResponse,
)
def get_goods_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    receipt = db.scalar(
        select(GoodsReceipt).where(
            GoodsReceipt.id == receipt_id
        )
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods receipt not found.",
        )

    return receipt


@router.post(
    "/{receipt_id}/receive",
    response_model=GoodsReceiptResponse,
)
def receive_goods(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------
    # Lock receipt
    # -----------------------------
    receipt = db.scalar(
        select(GoodsReceipt)
        .where(GoodsReceipt.id == receipt_id)
        .with_for_update()
    )

    if not receipt:
        raise HTTPException(
            status_code=404,
            detail="Goods receipt not found.",
        )

    if receipt.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT goods receipts can be received.",
        )

    # -----------------------------
    # Lock PO
    # -----------------------------
    purchase_order = db.scalar(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.id == receipt.purchase_order_id
        )
        .with_for_update()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found.",
        )

    if purchase_order.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail="Purchase order must be CONFIRMED.",
        )

    # -----------------------------
    # Process every received item
    # -----------------------------
    receipt_items = db.scalars(
        select(GoodsReceiptItem).where(
            GoodsReceiptItem.receipt_id == receipt.id
        )
    ).all()

    for receipt_item in receipt_items:

        # Lock inventory row
        inventory = db.scalar(
            select(Inventory)
            .where(
                Inventory.warehouse_id == receipt.warehouse_id,
                Inventory.product_id == receipt_item.product_id,
            )
            .with_for_update()
        )

        # Create inventory record if it doesn't exist
        if not inventory:
            inventory = Inventory(
                warehouse_id=receipt.warehouse_id,
                product_id=receipt_item.product_id,
                quantity=0,
                reserved_quantity=0,
                reorder_level=0,
            )

            db.add(inventory)
            db.flush()

        # Increase inventory
        inventory.quantity += receipt_item.received_quantity

        # Record movement
        movement = InventoryMovement(
            inventory_id=inventory.id,
            movement_type="STOCK_IN",
            quantity=receipt_item.received_quantity,
            reference_type="GOODS_RECEIPT",
            reference_id=receipt.id,
        )

        db.add(movement)

    # -----------------------------
    # Mark receipt received
    # -----------------------------
    receipt.status = "RECEIVED"

    db.commit()
    db.refresh(receipt)

    total_received = sum(
        item.received_quantity
        for item in receipt_items
    )

    emit_business_event(
        event_type=EventTypes.GOODS_RECEIVED,
        entity_type="GOODS_RECEIPT",
        entity_id=receipt.id,
        company_id=purchase_order.company_id,
        payload={
            "receipt_number": receipt.receipt_number,
            "purchase_order_id": receipt.purchase_order_id,
            "warehouse_id": receipt.warehouse_id,
            "total_received": total_received,
            "status": receipt.status,
        },
    )

    return receipt