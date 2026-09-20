from ollama import Client
from sqlalchemy.orm import Session

from app.ai.config import ai_settings
from app.ai.prompts import RAG_PROMPT_TEMPLATE
from app.services.search_service import semantic_search


def retrieve_context(
    db: Session,
    question: str,
    company_id: int | None = None,
    top_k: int | None = None,
) -> dict:
    k = top_k or ai_settings.rag_top_k

    results = semantic_search(
        db=db,
        query=question,
        company_id=company_id,
        top_k=k,
    )

    sources = []
    context_parts = []

    for row in results:
        similarity = float(row.similarity)

        sources.append({
            "document_id": row.document_id,
            "document_title": row.document_title,
            "document_type": row.document_type,
            "chunk_id": row.id,
            "chunk_index": row.chunk_index,
            "similarity": round(similarity, 4),
        })

        context_parts.append(
            f"Document: {row.document_title}\n"
            f"Document Type: {row.document_type}\n"
            f"Similarity: {similarity:.4f}\n\n"
            f"Content:\n{row.content}"
        )

    context = "\n\n".join(context_parts)

    if len(context) > ai_settings.max_context_length:
        context = context[:ai_settings.max_context_length]

    return {
        "context": context,
        "sources": sources,
        "result_count": len(results),
    }


def generate_rag_answer(
    question: str,
    context: str,
) -> str:

    client = Client(host=ai_settings.ollama_host)

    prompt = RAG_PROMPT_TEMPLATE.format(
        question=question,
        context=context,
    )

    response = client.chat(
        model=ai_settings.ollama_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are NEXUS AI, an enterprise document "
                    "intelligence assistant. Answer ONLY using "
                    "the supplied document context. Never invent "
                    "facts. If the answer is not contained in "
                    "the context, clearly say so."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        options={
            "temperature": 0.1,
        },
    )

    answer = response["message"]["content"].strip()

    if not answer:
        raise RuntimeError("Ollama returned an empty response.")

    return answer
