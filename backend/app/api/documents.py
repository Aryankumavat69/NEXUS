from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.models.company import Company
from app.models.document import Document, DocumentVersion
from app.models.document_chunk import DocumentChunk

from app.schemas.document import (
    DocumentCreate,
    DocumentResponse,
)

from app.services.document_service import (
    STORAGE_DIR,
    ALLOWED_MIME_TYPES,
    ensure_storage_directory,
    extract_text,
    clean_text,
    chunk_text,
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


# ============================================================
# CREATE DOCUMENT METADATA
# ============================================================

@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    payload: DocumentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    document = Document(
        company_id=payload.company_id,
        document_type=payload.document_type.upper(),
        title=payload.title,
        file_name=payload.file_name,
        file_path=payload.file_path,
        mime_type=payload.mime_type,
        status="UPLOADED",
    )

    db.add(document)
    db.flush()

    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        extracted_text=None,
    )

    db.add(version)

    db.commit()
    db.refresh(document)

    return document


# ============================================================
# UPLOAD ACTUAL DOCUMENT FILE
# ============================================================

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    company_id: int,
    document_type: str,
    title: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # --------------------------------------------------------
    # Validate company
    # --------------------------------------------------------

    company = db.scalar(
        select(Company).where(
            Company.id == company_id
        )
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported file type. "
                "Allowed file types: PDF, DOCX, TXT."
            ),
        )

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    original_filename = Path(
        file.filename
    ).name

    extension = Path(
        original_filename
    ).suffix.lower()

    # --------------------------------------------------------
    # Generate safe stored filename
    # --------------------------------------------------------

    stored_filename = (
        f"{uuid4().hex}{extension}"
    )

    ensure_storage_directory()

    file_path = (
        STORAGE_DIR / stored_filename
    )

    # --------------------------------------------------------
    # Read uploaded file
    # --------------------------------------------------------

    try:
        contents = await file.read()

        # Maximum file size = 20 MB
        max_size = 20 * 1024 * 1024

        if len(contents) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size cannot exceed 20 MB.",
            )

        # ----------------------------------------------------
        # Save file
        # ----------------------------------------------------

        file_path.write_bytes(contents)

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {exc}",
        )

    # --------------------------------------------------------
    # Create document database record
    # --------------------------------------------------------

    document = Document(
        company_id=company_id,
        document_type=document_type.upper(),
        title=title,
        file_name=original_filename,
        file_path=str(file_path),
        mime_type=file.content_type,
        status="UPLOADED",
    )

    db.add(document)

    # Generate document ID
    db.flush()

    # --------------------------------------------------------
    # Create first document version
    # --------------------------------------------------------

    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        extracted_text=None,
    )

    db.add(version)

    db.commit()
    db.refresh(document)

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "id": document.id,
        "company_id": document.company_id,
        "document_type": document.document_type,
        "title": document.title,
        "file_name": document.file_name,
        "mime_type": document.mime_type,
        "status": document.status,
        "message": "Document uploaded successfully.",
    }


# ============================================================
# LIST DOCUMENTS
# ============================================================

@router.get(
    "",
    response_model=list[DocumentResponse],
)
def list_documents(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.scalars(
        select(Document).order_by(
            Document.id.desc()
        )
    ).all()


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    document = db.scalar(
        select(Document).where(
            Document.id == document_id
        )
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return document


# ============================================================
# PROCESS DOCUMENT
# Extract → Clean → Chunk → Store
# ============================================================

@router.post(
    "/{document_id}/process",
)
def process_document(
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # --------------------------------------------------------
    # Get latest document version
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document version not found.",
        )

    # --------------------------------------------------------
    # Mark document as processing
    # --------------------------------------------------------

    document.status = "PROCESSING"

    db.commit()

    try:
        # ----------------------------------------------------
        # Extract text
        # ----------------------------------------------------

        extracted_text = extract_text(
            document.file_path,
            document.mime_type,
        )

        if not extracted_text:
            raise ValueError(
                "No readable text was extracted from the document."
            )

        # ----------------------------------------------------
        # Clean extracted text
        # ----------------------------------------------------

        cleaned_text = clean_text(
            extracted_text
        )

        if not cleaned_text:
            raise ValueError(
                "Document contains no usable text."
            )

        # ----------------------------------------------------
        # Split text into chunks
        # ----------------------------------------------------

        chunks = chunk_text(
            cleaned_text,
            chunk_size=1000,
            overlap=150,
        )

        if not chunks:
            raise ValueError(
                "Document produced no text chunks."
            )

        # ----------------------------------------------------
        # Save extracted text
        # ----------------------------------------------------

        version.extracted_text = cleaned_text

        # ----------------------------------------------------
        # Delete previous chunks
        # ----------------------------------------------------

        db.query(
            DocumentChunk
        ).filter(
            DocumentChunk.document_version_id
            == version.id
        ).delete(
            synchronize_session=False
        )

        # ----------------------------------------------------
        # Save new chunks
        # ----------------------------------------------------

        for index, content in enumerate(chunks):

            db.add(
                DocumentChunk(
                    document_version_id=version.id,
                    chunk_index=index,
                    content=content,
                )
            )

        # ----------------------------------------------------
        # Mark processing completed
        # ----------------------------------------------------

        document.status = "PROCESSED"

        db.commit()

        return {
            "document_id": document.id,
            "version_id": version.id,
            "status": document.status,
            "characters": len(cleaned_text),
            "chunks": len(chunks),
            "message": "Document processed successfully.",
        }

    except Exception as exc:

        db.rollback()

        # Try to mark processing failure
        document = db.scalar(
            select(Document).where(
                Document.id == document_id
            )
        )

        if document:
            document.status = "PROCESSING_FAILED"
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing failed: {exc}",
        )


# ============================================================
# GET DOCUMENT CHUNKS
# ============================================================

@router.get(
    "/{document_id}/chunks",
)
def get_document_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # --------------------------------------------------------
    # Verify document exists
    # --------------------------------------------------------

    document = db.scalar(
        select(Document).where(
            Document.id == document_id
        )
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
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
        return []

    # --------------------------------------------------------
    # Get chunks
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

    # --------------------------------------------------------
    # Return chunks
    # --------------------------------------------------------

    return [
        {
            "id": chunk.id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
        }
        for chunk in chunks
    ]