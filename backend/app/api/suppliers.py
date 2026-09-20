from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.company import Company
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierResponse


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
)


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    request: SupplierCreate,
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
        db.query(Supplier)
        .filter(
            Supplier.supplier_code == request.supplier_code.strip().upper()
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Supplier code already exists.",
        )

    supplier = Supplier(
        company_id=request.company_id,
        supplier_code=request.supplier_code.strip().upper(),
        supplier_status=request.supplier_status.strip().upper(),
        payment_terms_days=request.payment_terms_days,
        supplier_rating=request.supplier_rating,
    )

    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    return supplier


@router.get(
    "",
    response_model=list[SupplierResponse],
)
def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Supplier)
        .order_by(Supplier.id.desc())
        .all()
    )


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = (
        db.query(Supplier)
        .filter(Supplier.id == supplier_id)
        .first()
    )

    if not supplier:
        raise HTTPException(
            status_code=404,
            detail="Supplier not found.",
        )

    return supplier