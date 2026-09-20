from pathlib import Path
import re

from docx import Document as DocxDocument
from pypdf import PdfReader


STORAGE_DIR = Path("storage/documents")

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


def ensure_storage_directory() -> None:
    STORAGE_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )


def extract_text(
    file_path: str,
    mime_type: str,
) -> str:

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Document file not found: {file_path}"
        )

    if mime_type == "application/pdf":

        reader = PdfReader(str(path))

        pages = []

        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)

        return "\n".join(pages).strip()

    if mime_type == (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):

        document = DocxDocument(str(path))

        paragraphs = [
            paragraph.text.strip()
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(paragraphs).strip()

    if mime_type == "text/plain":

        return path.read_text(
            encoding="utf-8",
            errors="ignore",
        ).strip()

    raise ValueError(
        f"Unsupported document type: {mime_type}"
    )


def clean_text(text: str) -> str:

    # Normalize whitespace
    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    # Normalize excessive newlines
    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    # Remove spaces at line boundaries
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    return "\n".join(lines).strip()


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 150,
) -> list[str]:

    if not text:
        return []

    if overlap >= chunk_size:
        raise ValueError(
            "overlap must be smaller than chunk_size"
        )

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = min(
            start + chunk_size,
            text_length,
        )

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - overlap

    return chunks