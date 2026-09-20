
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.ai.knowledge_graph.schemas import (
    KnowledgeGraphResponse,
)

from app.ai.knowledge_graph.service import (
    build_sales_order_graph,
)


router = APIRouter(
    prefix="/ai/knowledge-graph",
    tags=["AI Knowledge Graph"],
)


@router.get(
    "/sales-orders/{sales_order_id}",
    response_model=KnowledgeGraphResponse,
)
def sales_order_knowledge_graph(
    sales_order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    try:

        return build_sales_order_graph(
            db=db,
            sales_order_id=sales_order_id,
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )