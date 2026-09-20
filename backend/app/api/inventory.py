from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.inventory import Inventory
from app.models.inventory_movement import InventoryMovement
from app.models.product import Product
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.inventory import (
    InventoryCreate,
    InventoryResponse,
    StockMovementRequest,
    StockMovementResponse,
)


router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)


@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory(
    request: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    warehouse = (
        db.query(Warehouse)
        .filter(
            Warehouse.id == request.warehouse_id,
            Warehouse.is_active.is_(True),
        )
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found.",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == request.product_id,
            Product.is_active.is_(True),
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    if warehouse.company_id != product.company_id:
        raise HTTPException(
            status_code=400,
            detail="Warehouse and product belong to different companies.",
        )

    existing = (
        db.query(Inventory)
        .filter(
            Inventory.warehouse_id == request.warehouse_id,
            Inventory.product_id == request.product_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Inventory record already exists.",
        )

    inventory = Inventory(
        warehouse_id=request.warehouse_id,
        product_id=request.product_id,
        quantity=0,
        reserved_quantity=0,
        reorder_level=request.reorder_level,
    )

    db.add(inventory)
    db.commit()
    db.refresh(inventory)

    return inventory


@router.get(
    "",
    response_model=list[InventoryResponse],
)
def list_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Inventory)
        .order_by(Inventory.id.desc())
        .all()
    )


@router.post(
    "/movement",
    response_model=StockMovementResponse,
)
def create_stock_movement(
    request: StockMovementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.warehouse_id == request.warehouse_id,
            Inventory.product_id == request.product_id,
        )
        .with_for_update()
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory record not found.",
        )

    if request.movement_type == "STOCK_IN":
        inventory.quantity += request.quantity

    elif request.movement_type == "STOCK_OUT":
        available_quantity = (
            inventory.quantity - inventory.reserved_quantity
        )

        if request.quantity > available_quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient available stock. "
                    f"Available quantity: {available_quantity}."
                ),
            )

        inventory.quantity -= request.quantity

    elif request.movement_type == "ADJUSTMENT":
        inventory.quantity = request.quantity

    movement = InventoryMovement(
        inventory_id=inventory.id,
        movement_type=request.movement_type,
        quantity=request.quantity,
        reference_type=request.reference_type,
        reference_id=request.reference_id,
        notes=request.notes,
    )

    db.add(movement)

    db.commit()
    db.refresh(inventory)

    low_stock = inventory.quantity <= inventory.reorder_level

    return {
        "inventory_id": inventory.id,
        "movement_type": request.movement_type,
        "quantity": request.quantity,
        "current_quantity": inventory.quantity,
        "low_stock": low_stock,
    }