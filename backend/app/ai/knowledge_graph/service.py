from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.shipment import Shipment
from app.models.inventory import Inventory


def node_key(entity_type: str, entity_id: int) -> str:
    return f"{entity_type}:{entity_id}"


def add_node(
    nodes: dict[str, dict],
    entity_type: str,
    entity_id: int,
) -> str:

    key = node_key(entity_type, entity_id)

    nodes[key] = {
        "id": key,
        "entity_type": entity_type,
        "entity_id": entity_id,
    }

    return key


def add_relationship(
    relationships: list[dict],
    source: str,
    target: str,
    relationship: str,
) -> None:

    relationship_data = {
        "source": source,
        "target": target,
        "relationship": relationship,
    }

    if relationship_data not in relationships:
        relationships.append(relationship_data)


def build_sales_order_graph(
    db: Session,
    sales_order_id: int,
) -> dict:

    sales_order = db.get(
        SalesOrder,
        sales_order_id,
    )

    if not sales_order:
        raise ValueError(
            f"Sales order {sales_order_id} not found."
        )

    nodes: dict[str, dict] = {}
    relationships: list[dict] = []

    sales_order_node = add_node(
        nodes,
        "SALES_ORDER",
        sales_order.id,
    )

    company_node = add_node(
        nodes,
        "COMPANY",
        sales_order.company_id,
    )

    customer_node = add_node(
        nodes,
        "CUSTOMER",
        sales_order.customer_id,
    )

    add_relationship(
        relationships,
        sales_order_node,
        company_node,
        "BELONGS_TO_COMPANY",
    )

    add_relationship(
        relationships,
        sales_order_node,
        customer_node,
        "PLACED_BY_CUSTOMER",
    )

    items = db.execute(
        select(SalesOrderItem).where(
            SalesOrderItem.order_id == sales_order.id
        )
    ).scalars().all()

    for item in items:

        product_node = add_node(
            nodes,
            "PRODUCT",
            item.product_id,
        )

        item_node = add_node(
            nodes,
            "SALES_ORDER_ITEM",
            item.id,
        )

        add_relationship(
            relationships,
            sales_order_node,
            item_node,
            "CONTAINS_ITEM",
        )

        add_relationship(
            relationships,
            item_node,
            product_node,
            "REFERENCES_PRODUCT",
        )

        inventory_rows = db.execute(
            select(Inventory).where(
                Inventory.product_id == item.product_id
            )
        ).scalars().all()

        for inventory in inventory_rows:

            inventory_node = add_node(
                nodes,
                "INVENTORY",
                inventory.id,
            )

            warehouse_node = add_node(
                nodes,
                "WAREHOUSE",
                inventory.warehouse_id,
            )

            add_relationship(
                relationships,
                product_node,
                inventory_node,
                "HAS_INVENTORY",
            )

            add_relationship(
                relationships,
                inventory_node,
                warehouse_node,
                "STORED_IN_WAREHOUSE",
            )

    shipments = db.execute(
        select(Shipment).where(
            Shipment.sales_order_id == sales_order.id
        )
    ).scalars().all()

    for shipment in shipments:

        shipment_node = add_node(
            nodes,
            "SHIPMENT",
            shipment.id,
        )

        add_relationship(
            relationships,
            sales_order_node,
            shipment_node,
            "FULFILLED_BY_SHIPMENT",
        )

        for container in shipment.containers:

            container_node = add_node(
                nodes,
                "CONTAINER",
                container.id,
            )

            add_relationship(
                relationships,
                shipment_node,
                container_node,
                "USES_CONTAINER",
            )

    return {
        "entity_type": "SALES_ORDER",
        "entity_id": sales_order.id,
        "nodes": list(nodes.values()),
        "relationships": relationships,
    }