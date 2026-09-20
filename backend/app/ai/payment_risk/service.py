from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import Payment, PaymentAllocation
from app.models.invoice import Invoice
from app.ai.payment_risk.model import calculate_payment_risk


def analyze_payment(
    db: Session,
    payment_id: int,
) -> dict:

    payment = db.get(Payment, payment_id)

    if not payment:
        raise ValueError(
            f"Payment {payment_id} not found."
        )

    allocations = db.execute(
        select(PaymentAllocation).where(
            PaymentAllocation.payment_id == payment_id
        )
    ).scalars().all()

    allocated_amount = sum(
        float(a.amount)
        for a in allocations
    )

    invoice_amount = None

    if allocations:
        invoice = db.get(
            Invoice,
            allocations[0].invoice_id,
        )

        if invoice:
            invoice_amount = float(
                invoice.total_amount
            )

    risk = calculate_payment_risk(
        amount=float(payment.amount),
        invoice_amount=invoice_amount,
        allocated_amount=allocated_amount,
    )

    return {
        "payment_id": payment.id,
        "amount": float(payment.amount),
        **risk,
    }