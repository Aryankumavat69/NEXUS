from uuid import uuid4
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.purchase_order import (
    PurchaseOrder,
    PurchaseOrderItem,
)
from app.models.company import Company
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.user import User
from app.core.dependencies import get_current_user

from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
)
from app.events.service import (
    EventTypes,
    emit_business_event,
)

# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)


# =========================================================
# DATABASE DEPENDENCY
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# CREATE PURCHASE ORDER
# =========================================================

@router.post(
    "",
    response_model=PurchaseOrderResponse,
    status_code=201,
)
def create_purchase_order(
    request: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------------------------------------
    # 1. Validate company
    # -----------------------------------------------------

    company = (
        db.query(Company)
        .filter(Company.id == request.company_id)
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    # -----------------------------------------------------
    # 2. Validate supplier
    # -----------------------------------------------------

    supplier = (
        db.query(Supplier)
        .filter(
            Supplier.id == request.supplier_id,
            Supplier.company_id == request.company_id,
        )
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found for this company.",
        )

    # -----------------------------------------------------
    # 3. Temporary PO number
    # -----------------------------------------------------

    temporary_po_number = f"TEMP-PO-{uuid4().hex}"

    purchase_order = PurchaseOrder(
        company_id=request.company_id,
        supplier_id=request.supplier_id,
        po_number=temporary_po_number,
        status="DRAFT",
        currency=request.currency.upper(),
        total_amount=Decimal("0.00"),
    )

    db.add(purchase_order)

    # Generate database ID
    db.flush()

    # -----------------------------------------------------
    # 4. Generate permanent PO number
    # -----------------------------------------------------

    purchase_order.po_number = (
        f"PO-{purchase_order.id:06d}"
    )

    # -----------------------------------------------------
    # 5. Process items
    # -----------------------------------------------------

    total_amount = Decimal("0.00")

    for item in request.items:

        # -------------------------------------------------
        # Validate product
        # -------------------------------------------------

        product = (
            db.query(Product)
            .filter(
                Product.id == item.product_id,
                Product.company_id == request.company_id,
                Product.is_active == True,
            )
            .first()
        )

        if not product:
            db.rollback()

            raise HTTPException(
                status_code=404,
                detail=(
                    f"Product {item.product_id} "
                    f"not found for this company."
                ),
            )

        # -------------------------------------------------
        # Use submitted purchase price
        # -------------------------------------------------

        unit_price = item.unit_price

        line_total = (
            unit_price * item.quantity
        )

        # -------------------------------------------------
        # Create PO item
        # -------------------------------------------------

        purchase_order_item = PurchaseOrderItem(
            order_id=purchase_order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=unit_price,
            line_total=line_total,
        )

        db.add(purchase_order_item)

        total_amount += line_total

    # -----------------------------------------------------
    # 6. Calculate total server-side
    # -----------------------------------------------------

    purchase_order.total_amount = total_amount

    # -----------------------------------------------------
    # 7. Commit
    # -----------------------------------------------------

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    # -----------------------------------------------------
    # 8. Refresh
    # -----------------------------------------------------

    db.refresh(purchase_order)

    # -----------------------------------------------------
    # 9. Load items
    # -----------------------------------------------------

    purchase_order.items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.order_id
            == purchase_order.id
        )
        .all()
    )

    return purchase_order


# =========================================================
# GET ALL PURCHASE ORDERS
# =========================================================

@router.get(
    "",
    response_model=list[PurchaseOrderResponse],
)
def get_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_orders = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.id.desc())
        .all()
    )

    for purchase_order in purchase_orders:

        purchase_order.items = (
            db.query(PurchaseOrderItem)
            .filter(
                PurchaseOrderItem.order_id
                == purchase_order.id
            )
            .all()
        )

    return purchase_orders


# =========================================================
# GET SINGLE PURCHASE ORDER
# =========================================================

@router.get(
    "/{order_id}",
    response_model=PurchaseOrderResponse,
)
def get_purchase_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == order_id)
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found.",
        )

    purchase_order.items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.order_id
            == purchase_order.id
        )
        .all()
    )

    return purchase_order


# =========================================================
# CONFIRM PURCHASE ORDER
# =========================================================

@router.post(
    "/{order_id}/confirm",
    response_model=PurchaseOrderResponse,
)
def confirm_purchase_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------------------------------------
    # 1. Find purchase order
    # -----------------------------------------------------

    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == order_id)
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found.",
        )

    # -----------------------------------------------------
    # 2. Validate status
    # -----------------------------------------------------

    if purchase_order.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail=(
                "Purchase order cannot be confirmed "
                f"because its current status is "
                f"{purchase_order.status}."
            ),
        )

    # -----------------------------------------------------
    # 3. Confirm
    # -----------------------------------------------------

    purchase_order.status = "CONFIRMED"

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    # -----------------------------------------------------
    # 4. Refresh
    # -----------------------------------------------------

    db.refresh(purchase_order)

    # -----------------------------------------------------
    # 5. Load items
    # -----------------------------------------------------

    purchase_order.items = (
        db.query(PurchaseOrderItem)
        .filter(
            PurchaseOrderItem.order_id
            == purchase_order.id
        )
        .all()
    )

    emit_business_event(
        event_type=EventTypes.PURCHASE_ORDER_CONFIRMED,
        entity_type="PURCHASE_ORDER",
        entity_id=purchase_order.id,
        company_id=purchase_order.company_id,
        payload={
            "po_number": purchase_order.po_number,
            "supplier_id": purchase_order.supplier_id,
            "currency": purchase_order.currency,
            "total_amount": float(
                purchase_order.total_amount
            ),
            "status": purchase_order.status,
            "item_count": len(
                purchase_order.items
            ),
        },
    )

    return purchase_order