from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.rag import retrieve_context, generate_rag_answer
from app.ai.schemas import (
    AIHealthResponse,
    RAGRequest,
    RAGResponse,
)
from app.ai.service import ai_service
from app.core.dependencies import get_current_user
from app.db.database import get_db


router = APIRouter(
    prefix="/ai",
    tags=["AI Intelligence"],
)


@router.get(
    "/health",
    response_model=AIHealthResponse,
)
def ai_health():
    return ai_service.health()


@router.post(
    "/rag/ask",
    response_model=RAGResponse,
)
def rag_ask(
    request: RAGRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        retrieval = retrieve_context(
            db=db,
            question=request.question.strip(),
            company_id=request.company_id,
            top_k=request.top_k,
        )

        if retrieval["result_count"] == 0:
            return RAGResponse(
                request_id=ai_service.create_request_id(),
                ai_module="rag",
                status="NO_CONTEXT",
                confidence=0.0,
                answer=(
                    "I could not find relevant information "
                    "in the available documents."
                ),
                sources=[],
                retrieved_chunks=0,
                requires_human_approval=False,
            )

        answer = generate_rag_answer(
            question=request.question.strip(),
            context=retrieval["context"],
        )

        confidence = max(
            float(source["similarity"])
            for source in retrieval["sources"]
        )

        return RAGResponse(
            request_id=ai_service.create_request_id(),
            ai_module="rag",
            status="SUCCESS",
            confidence=round(confidence, 4),
            answer=answer,
            sources=retrieval["sources"],
            retrieved_chunks=retrieval["result_count"],
            requires_human_approval=False,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"RAG generation failed: {exc}",
        )