from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from pgvector.sqlalchemy import Vector

from app.db.base import Base, TimestampMixin


class DocumentChunkEmbedding(TimestampMixin, Base):
    __tablename__ = "document_chunk_embeddings"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    document_chunk_id: Mapped[int] = mapped_column(
        ForeignKey(
            "document_chunks.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    embedding: Mapped[list[float]] = mapped_column(
        Vector(384),
        nullable=False,
    )

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="all-MiniLM-L6-v2",
    )

    dimensions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=384,
    )