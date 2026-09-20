from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.models.document import Document, DocumentVersion
from app.models.document_chunk import DocumentChunk
from app.models.embedding import DocumentChunkEmbedding

from app.services.embedding_service import generate_embeddings


router = APIRouter(
    prefix="/embeddings",
    tags=["Embeddings"],
)


# ============================================================
# GENERATE EMBEDDINGS FOR A DOCUMENT
# ============================================================

@router.post(
    "/documents/{document_id}/generate"
)
def generate_document_embeddings(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # --------------------------------------------------------
    # Find document
    # --------------------------------------------------------

    document = db.scalar(
        select(Document).where(
            Document.id == document_id
        )
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    # --------------------------------------------------------
    # Find latest document version
    # --------------------------------------------------------

    version = db.scalar(
        select(DocumentVersion)
        .where(
            DocumentVersion.document_id == document_id
        )
        .order_by(
            DocumentVersion.version_number.desc()
        )
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Document version not found.",
        )

    # --------------------------------------------------------
    # Get document chunks
    # --------------------------------------------------------

    chunks = db.scalars(
        select(DocumentChunk)
        .where(
            DocumentChunk.document_version_id
            == version.id
        )
        .order_by(
            DocumentChunk.chunk_index
        )
    ).all()

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail=(
                "Document has no chunks. "
                "Process the document first."
            ),
        )

    # --------------------------------------------------------
    # Prepare text
    # --------------------------------------------------------

    texts = [
        chunk.content
        for chunk in chunks
    ]

    try:
        # ----------------------------------------------------
        # Generate embeddings
        # ----------------------------------------------------

        embeddings = generate_embeddings(
            texts
        )

        if len(embeddings) != len(chunks):
            raise ValueError(
                "Number of embeddings does not match "
                "number of document chunks."
            )

        # ----------------------------------------------------
        # Store embeddings
        # ----------------------------------------------------

        generated_count = 0

        for chunk, embedding in zip(
            chunks,
            embeddings,
        ):

            existing = db.scalar(
                select(DocumentChunkEmbedding).where(
                    DocumentChunkEmbedding.document_chunk_id
                    == chunk.id
                )
            )

            if existing:

                existing.embedding = embedding

                existing.model_name = (
                    "all-MiniLM-L6-v2"
                )

                existing.dimensions = 384

            else:

                embedding_record = (
                    DocumentChunkEmbedding(
                        document_chunk_id=chunk.id,
                        embedding=embedding,
                        model_name="all-MiniLM-L6-v2",
                        dimensions=384,
                    )
                )

                db.add(
                    embedding_record
                )

            generated_count += 1

        db.commit()

        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return {
            "document_id": document.id,
            "version_id": version.id,
            "chunks_processed": generated_count,
            "embedding_model": "all-MiniLM-L6-v2",
            "dimensions": 384,
            "message": (
                "Embeddings generated successfully."
            ),
        }

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Embedding generation failed: {exc}"
            ),
        )


# ============================================================
# GET EMBEDDING STATUS
# ============================================================

@router.get(
    "/documents/{document_id}/status"
)
def get_embedding_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # --------------------------------------------------------
    # Verify document
    # --------------------------------------------------------

    document = db.scalar(
        select(Document).where(
            Document.id == document_id
        )
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    # --------------------------------------------------------
    # Get latest version
    # --------------------------------------------------------

    version = db.scalar(
        select(DocumentVersion)
        .where(
            DocumentVersion.document_id == document_id
        )
        .order_by(
            DocumentVersion.version_number.desc()
        )
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Document version not found.",
        )

    # --------------------------------------------------------
    # Count document chunks
    # --------------------------------------------------------

    chunks = db.scalars(
        select(DocumentChunk)
        .where(
            DocumentChunk.document_version_id
            == version.id
        )
    ).all()

    total_chunks = len(chunks)

    # --------------------------------------------------------
    # Count generated embeddings
    # --------------------------------------------------------

    chunk_ids = [
        chunk.id
        for chunk in chunks
    ]

    if not chunk_ids:
        embedded_chunks = 0

    else:

        embedded_chunks = len(
            db.scalars(
                select(DocumentChunkEmbedding)
                .where(
                    DocumentChunkEmbedding.document_chunk_id.in_(
                        chunk_ids
                    )
                )
            ).all()
        )

    # --------------------------------------------------------
    # Determine status
    # --------------------------------------------------------

    if total_chunks == 0:

        embedding_status = "NO_CHUNKS"

    elif embedded_chunks == 0:

        embedding_status = "NOT_GENERATED"

    elif embedded_chunks < total_chunks:

        embedding_status = "PARTIAL"

    else:

        embedding_status = "COMPLETED"

    # --------------------------------------------------------
    # Return status
    # --------------------------------------------------------

    return {
        "document_id": document.id,
        "version_id": version.id,
        "total_chunks": total_chunks,
        "embedded_chunks": embedded_chunks,
        "embedding_status": embedding_status,
        "embedding_model": "all-MiniLM-L6-v2",
        "dimensions": 384,
    }