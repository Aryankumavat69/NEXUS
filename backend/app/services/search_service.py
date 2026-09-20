from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentVersion
from app.models.document_chunk import DocumentChunk
from app.models.embedding import DocumentChunkEmbedding

from app.services.embedding_service import generate_embedding


def semantic_search(
    db: Session,
    query: str,
    company_id: int | None = None,
    top_k: int = 5,
):
    if not query or not query.strip():
        raise ValueError(
            "Search query cannot be empty."
        )

    if top_k < 1 or top_k > 20:
        raise ValueError(
            "top_k must be between 1 and 20."
        )

    # --------------------------------------------------------
    # Generate embedding for user query
    # --------------------------------------------------------

    query_embedding = generate_embedding(
        query.strip()
    )

    # --------------------------------------------------------
    # Calculate cosine distance
    # --------------------------------------------------------

    distance = (
        DocumentChunkEmbedding.embedding.cosine_distance(
            query_embedding
        )
    )

    similarity = (
        1 - distance
    ).label("similarity")

    # --------------------------------------------------------
    # Build semantic search query
    # --------------------------------------------------------

    statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.chunk_index,
            DocumentChunk.content,
            Document.id.label("document_id"),
            Document.title.label("document_title"),
            Document.document_type,
            similarity,
        )
        .join(
            DocumentChunkEmbedding,
            DocumentChunkEmbedding.document_chunk_id
            == DocumentChunk.id,
        )
        .join(
            DocumentVersion,
            DocumentVersion.id
            == DocumentChunk.document_version_id,
        )
        .join(
            Document,
            Document.id
            == DocumentVersion.document_id,
        )
        .order_by(
            distance.asc()
        )
        .limit(top_k)
    )

    # --------------------------------------------------------
    # Company isolation
    # --------------------------------------------------------

    if company_id is not None:
        statement = statement.where(
            Document.company_id == company_id
        )

    # --------------------------------------------------------
    # Execute
    # --------------------------------------------------------

    results = db.execute(
        statement
    ).all()

    return results