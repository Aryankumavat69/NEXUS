from sqlalchemy import CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class GoodsReceipt(TimestampMixin, Base):
    __tablename__ = "goods_receipts"

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'RECEIVED', 'CANCELLED')",
            name="ck_goods_receipts_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    purchase_order_id: Mapped[int] = mapped_column(
        ForeignKey("purchase_orders.id"),
        nullable=False,
        index=True,
    )

    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id"),
        nullable=False,
        index=True,
    )

    receipt_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
    )

    items: Mapped[list["GoodsReceiptItem"]] = relationship(
        "GoodsReceiptItem",
        back_populates="receipt",
        cascade="all, delete-orphan",
    )


class GoodsReceiptItem(TimestampMixin, Base):
    __tablename__ = "goods_receipt_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    receipt_id: Mapped[int] = mapped_column(
        ForeignKey("goods_receipts.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    received_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    receipt: Mapped["GoodsReceipt"] = relationship(
        "GoodsReceipt",
        back_populates="items",
    )