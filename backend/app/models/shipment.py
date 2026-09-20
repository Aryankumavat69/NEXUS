from sqlalchemy import CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Shipment(TimestampMixin, Base):
    __tablename__ = "shipments"

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')",
            name="ck_shipments_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    sales_order_id: Mapped[int] = mapped_column(
        ForeignKey("sales_orders.id"),
        nullable=False,
        index=True,
    )

    shipment_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    origin_port: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    destination_port: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="DRAFT",
    )

    items: Mapped[list["ShipmentItem"]] = relationship(
        "ShipmentItem",
        back_populates="shipment",
        cascade="all, delete-orphan",
    )

    containers: Mapped[list["Container"]] = relationship(
        "Container",
        back_populates="shipment",
        cascade="all, delete-orphan",
    )


class ShipmentItem(TimestampMixin, Base):
    __tablename__ = "shipment_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    shipment_id: Mapped[int] = mapped_column(
        ForeignKey("shipments.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    shipment: Mapped["Shipment"] = relationship(
        "Shipment",
        back_populates="items",
    )


class Container(TimestampMixin, Base):
    __tablename__ = "containers"

    __table_args__ = (
        CheckConstraint(
            "status IN ('EMPTY', 'LOADED', 'IN_TRANSIT', 'DELIVERED')",
            name="ck_containers_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    shipment_id: Mapped[int] = mapped_column(
        ForeignKey("shipments.id"),
        nullable=False,
        index=True,
    )

    container_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    container_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="40HC",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="EMPTY",
    )

    shipment: Mapped["Shipment"] = relationship(
        "Shipment",
        back_populates="containers",
    )