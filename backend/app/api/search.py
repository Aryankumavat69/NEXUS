from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.services.search_service import semantic_search


router = APIRouter(
    prefix="/search",
    tags=["Semantic Search"],
)


@router.get("/documents")
def search_documents(
    q: str = Query(
        ...,
        min_length=2,
        max_length=500,
    ),
    company_id: int | None = Query(
        default=None,
        gt=0,
    ),
    top_k: int = Query(
        default=5,
        ge=1,
        le=20,
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:

        results = semantic_search(
            db=db,
            query=q,
            company_id=company_id,
            top_k=top_k,
        )

        return {
            "query": q,
            "results": [
                {
                    "document_id": row.document_id,
                    "document_title": row.document_title,
                    "document_type": row.document_type,
                    "chunk_id": row.id,
                    "chunk_index": row.chunk_index,
                    "similarity": round(
                        float(row.similarity),
                        4,
                    ),
                    "content": row.content,
                }
                for row in results
            ],
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Semantic search failed: {exc}",
        )