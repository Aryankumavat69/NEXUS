from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.models.receipt import Receipt
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.schemas.invoice import InvoiceResponse
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    ReceiptResponse,
)
from app.events.service import (
    EventTypes,
    emit_business_event,
)
router = APIRouter(
    prefix="/billing",
    tags=["Billing"],
)


@router.post(
    "/invoices/from-sales-order/{sales_order_id}",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invoice_from_sales_order(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sales_order = db.scalar(
        select(SalesOrder).where(
            SalesOrder.id == sales_order_id
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
            detail="Invoice can only be created for a CONFIRMED sales order.",
        )

    existing_invoice = db.scalar(
        select(Invoice).where(
            Invoice.sales_order_id == sales_order_id
        )
    )

    if existing_invoice:
        raise HTTPException(
            status_code=409,
            detail="An invoice already exists for this sales order.",
        )

    order_items = db.scalars(
        select(SalesOrderItem).where(
            SalesOrderItem.order_id == sales_order_id
        )
    ).all()

    if not order_items:
        raise HTTPException(
            status_code=400,
            detail="Sales order has no items.",
        )

    invoice = Invoice(
        sales_order_id=sales_order.id,
        invoice_number=f"TEMP-{uuid4().hex}",
        status="ISSUED",
        currency=sales_order.currency,
        total_amount=Decimal("0"),
        paid_amount=Decimal("0"),
    )

    db.add(invoice)
    db.flush()

    invoice.invoice_number = f"INV-{invoice.id:06d}"

    total = Decimal("0")

    for order_item in order_items:
        line_total = (
            Decimal(str(order_item.quantity))
            * Decimal(str(order_item.unit_price))
        )

        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=order_item.product_id,
            quantity=order_item.quantity,
            unit_price=order_item.unit_price,
            line_total=line_total,
        )

        db.add(invoice_item)
        total += line_total

    invoice.total_amount = total

    db.commit()
    db.refresh(invoice)

    emit_business_event(
        event_type=EventTypes.INVOICE_CREATED,
        entity_type="INVOICE",
        entity_id=invoice.id,
        company_id=sales_order.company_id,
        payload={
            "invoice_number": invoice.invoice_number,
            "sales_order_id": invoice.sales_order_id,
            "currency": invoice.currency,
            "total_amount": float(
                invoice.total_amount
            ),
            "paid_amount": float(
                invoice.paid_amount
            ),
            "status": invoice.status,
        },
    )

    return invoice


@router.get(
    "/invoices",
    response_model=list[InvoiceResponse],
)
def list_invoices(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.scalars(
        select(Invoice).order_by(Invoice.id.desc())
    ).all()


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceResponse,
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = db.scalar(
        select(Invoice).where(
            Invoice.id == invoice_id
        )
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    return invoice


@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoice = db.scalar(
        select(Invoice)
        .where(Invoice.id == payload.invoice_id)
        .with_for_update()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    if invoice.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cannot pay a cancelled invoice.",
        )

    currency = payload.currency.upper()

    if currency != invoice.currency:
        raise HTTPException(
            status_code=400,
            detail="Payment currency does not match invoice currency.",
        )

    remaining = (
        Decimal(str(invoice.total_amount))
        - Decimal(str(invoice.paid_amount))
    )

    if payload.amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds outstanding amount of {remaining}.",
        )

    payment = Payment(
        payment_number=f"TEMP-{uuid4().hex}",
        amount=payload.amount,
        currency=currency,
        payment_method=payload.payment_method.upper(),
        status="COMPLETED",
        reference=payload.reference,
    )

    db.add(payment)
    db.flush()

    payment.payment_number = f"PAY-{payment.id:06d}"

    allocation = PaymentAllocation(
        payment_id=payment.id,
        invoice_id=invoice.id,
        amount=payload.amount,
    )

    db.add(allocation)

    invoice.paid_amount = (
        Decimal(str(invoice.paid_amount))
        + payload.amount
    )

    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = "PAID"
    else:
        invoice.status = "PARTIALLY_PAID"

    db.commit()
    db.refresh(payment)

    emit_business_event(
        event_type=EventTypes.PAYMENT_CREATED,
        entity_type="PAYMENT",
        entity_id=payment.id,
        company_id=None,
        payload={
            "payment_number": payment.payment_number,
            "invoice_id": invoice.id,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "payment_method": payment.payment_method,
            "status": payment.status,
            "invoice_status": invoice.status,
        },
    )

    return payment


@router.post(
    "/payments/{payment_id}/receipt",
    response_model=ReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_receipt(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payment = db.scalar(
        select(Payment).where(
            Payment.id == payment_id
        )
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    existing_receipt = db.scalar(
        select(Receipt).where(
            Receipt.payment_id == payment_id
        )
    )

    if existing_receipt:
        raise HTTPException(
            status_code=409,
            detail="Receipt already exists for this payment.",
        )

    receipt = Receipt(
        payment_id=payment.id,
        receipt_number=f"TEMP-{uuid4().hex}",
        amount=payment.amount,
        currency=payment.currency,
    )

    db.add(receipt)
    db.flush()

    receipt.receipt_number = f"RCT-{receipt.id:06d}"

    db.commit()
    db.refresh(receipt)

    emit_business_event(
        event_type=EventTypes.RECEIPT_CREATED,
        entity_type="RECEIPT",
        entity_id=receipt.id,
        company_id=None,
        payload={
            "receipt_number": receipt.receipt_number,
            "payment_id": receipt.payment_id,
            "amount": float(receipt.amount),
            "currency": receipt.currency,
        },
    )

    return receipt