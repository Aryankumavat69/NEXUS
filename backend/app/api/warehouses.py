from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.company import Company
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse


router = APIRouter(
    prefix="/warehouses",
    tags=["Warehouses"],
)


@router.post(
    "",
    response_model=WarehouseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_warehouse(
    request: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = (
        db.query(Company)
        .filter(
            Company.id == request.company_id,
            Company.is_active.is_(True),
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    existing = (
        db.query(Warehouse)
        .filter(Warehouse.code == request.code)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Warehouse code already exists.",
        )

    warehouse = Warehouse(
        company_id=request.company_id,
        name=request.name,
        code=request.code,
        address=request.address,
    )

    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    return warehouse


@router.get(
    "",
    response_model=list[WarehouseResponse],
)
def list_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Warehouse)
        .filter(Warehouse.is_active.is_(True))
        .order_by(Warehouse.id.desc())
        .all()
    )


@router.get(
    "/{warehouse_id}",
    response_model=WarehouseResponse,
)
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    warehouse = (
        db.query(Warehouse)
        .filter(
            Warehouse.id == warehouse_id,
            Warehouse.is_active.is_(True),
        )
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found.",
        )

    return warehouse