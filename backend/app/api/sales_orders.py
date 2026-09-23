from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.customer import Customer
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.user import User
from app.models.company import Company
from app.core.dependencies import get_current_user

from app.schemas.sales_order import (
    SalesOrderCreate,
    SalesOrderResponse,
)
from app.events.service import (
    EventTypes,
    emit_business_event,
)

# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/sales-orders",
    tags=["Sales Orders"],
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
# CREATE SALES ORDER
# =========================================================

@router.post(
    "",
    response_model=SalesOrderResponse,
    status_code=201,
)
def create_sales_order(
    request: SalesOrderCreate,
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
    # 2. Validate customer
    # -----------------------------------------------------

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == request.customer_id,
            Customer.company_id == request.company_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found for this company.",
        )

    # -----------------------------------------------------
    # 3. Create order with temporary order number
    # -----------------------------------------------------
    # PostgreSQL requires order_number during INSERT.
    # Therefore, we create a temporary unique value first.

    temporary_order_number = f"TEMP-{uuid4().hex}"

    order = SalesOrder(
        company_id=request.company_id,
        customer_id=request.customer_id,
        order_number=temporary_order_number,
        currency=request.currency.upper(),
        status="DRAFT",
        total_amount=0,
    )

    db.add(order)

    # Flush generates the database ID.
    db.flush()

    # -----------------------------------------------------
    # 4. Generate permanent order number
    # -----------------------------------------------------

    order.order_number = f"SO-{order.id:06d}"

    # -----------------------------------------------------
    # 5. Process order items
    # -----------------------------------------------------

    total_amount = 0

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
        # Use database product price
        # -------------------------------------------------
        # The frontend-submitted unit_price is NOT trusted.
        # NEXUS uses the authoritative product price.

        unit_price = product.unit_price

        line_total = unit_price * item.quantity

        # -------------------------------------------------
        # Create order item
        # -------------------------------------------------

        order_item = SalesOrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=unit_price,
            line_total=line_total,
        )

        db.add(order_item)

        total_amount += line_total

    # -----------------------------------------------------
    # 6. Calculate order total on server
    # -----------------------------------------------------

    order.total_amount = total_amount

    # -----------------------------------------------------
    # 7. Commit transaction
    # -----------------------------------------------------

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    # -----------------------------------------------------
    # 8. Refresh order
    # -----------------------------------------------------

    db.refresh(order)

    # -----------------------------------------------------
    # 9. Load order items
    # -----------------------------------------------------

    items = (
        db.query(SalesOrderItem)
        .filter(
            SalesOrderItem.order_id == order.id
        )
        .all()
    )

    # Attach items for response
    order.items = items

    return order


# =========================================================
# GET ALL SALES ORDERS
# =========================================================

@router.get(
    "",
    response_model=list[SalesOrderResponse],
)
def get_sales_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders = (
        db.query(SalesOrder)
        .order_by(SalesOrder.id.desc())
        .all()
    )

    for order in orders:
        order.items = (
            db.query(SalesOrderItem)
            .filter(
                SalesOrderItem.order_id == order.id
            )
            .all()
        )

    return orders


# =========================================================
# GET SINGLE SALES ORDER
# =========================================================

@router.get(
    "/{order_id}",
    response_model=SalesOrderResponse,
)
def get_sales_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        db.query(SalesOrder)
        .filter(SalesOrder.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found.",
        )

    order.items = (
        db.query(SalesOrderItem)
        .filter(
            SalesOrderItem.order_id == order.id
        )
        .all()
    )

    return order


# =========================================================
# CONFIRM SALES ORDER
# =========================================================

@router.post(
    "/{order_id}/confirm",
    response_model=SalesOrderResponse,
)
def confirm_sales_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------------------------------------
    # 1. Find order
    # -----------------------------------------------------

    order = (
        db.query(SalesOrder)
        .filter(SalesOrder.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found.",
        )

    # -----------------------------------------------------
    # 2. Validate status
    # -----------------------------------------------------

    if order.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Order cannot be confirmed because "
                f"its current status is {order.status}."
            ),
        )

    # -----------------------------------------------------
    # 3. Load order items
    # -----------------------------------------------------

    items = (
        db.query(SalesOrderItem)
        .filter(
            SalesOrderItem.order_id == order.id
        )
        .all()
    )

    if not items:
        raise HTTPException(
            status_code=400,
            detail="Sales order has no items.",
        )

    # -----------------------------------------------------
    # 4. Reserve inventory
    # -----------------------------------------------------

    for item in items:

        inventory = (
            db.query(Inventory)
            .filter(
                Inventory.product_id == item.product_id
            )
            .with_for_update()
            .first()
        )

        if not inventory:
            db.rollback()

            raise HTTPException(
                status_code=400,
                detail=(
                    f"No inventory found for "
                    f"product {item.product_id}."
                ),
            )

        # Available = physical stock - already reserved stock
        available_quantity = (
            inventory.quantity
            - inventory.reserved_quantity
        )

        # -------------------------------------------------
        # Check available stock
        # -------------------------------------------------

        if available_quantity < item.quantity:
            db.rollback()

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient inventory for "
                    f"product {item.product_id}. "
                    f"Available: {available_quantity}, "
                    f"Required: {item.quantity}."
                ),
            )

        # -------------------------------------------------
        # Reserve stock
        # -------------------------------------------------

        inventory.reserved_quantity += item.quantity

    # -----------------------------------------------------
    # 5. Change order status
    # -----------------------------------------------------

    order.status = "CONFIRMED"

    # -----------------------------------------------------
    # 6. Commit reservation
    # -----------------------------------------------------

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    # -----------------------------------------------------
    # 7. Refresh order
    # -----------------------------------------------------

    db.refresh(order)

    order.items = (
        db.query(SalesOrderItem)
        .filter(
            SalesOrderItem.order_id == order.id
        )
        .all()
    )

    emit_business_event(
        event_type=EventTypes.SALES_ORDER_CONFIRMED,
        entity_type="SALES_ORDER",
        entity_id=order.id,
        company_id=order.company_id,
        payload={
            "order_number": order.order_number,
            "customer_id": order.customer_id,
            "currency": order.currency,
            "total_amount": float(order.total_amount),
            "status": order.status,
            "item_count": len(order.items),
        },
    )

    return order