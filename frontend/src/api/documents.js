import api from "./client";

/* =========================================================
   DOCUMENTS
========================================================= */

export const listDocuments = async (companyId = 1) => {
  const response = await api.get("/documents", {
    params: {
      company_id: companyId,
    },
  });

  return response.data;
};

export const getDocument = async (documentId) => {
  const response = await api.get(`/documents/${documentId}`);

  return response.data;
};

/* =========================================================
   UPLOAD
========================================================= */

export const uploadDocument = async (file, companyId = 1) => {
  const formData = new FormData();

  formData.append("company_id", companyId);
  formData.append("document_type", "GENERAL");
  formData.append("title", file.name);
  formData.append("file", file);

  const response = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000,
  });

  return response.data;
};

/* =========================================================
   PROCESS DOCUMENT
========================================================= */

export const processDocument = async (documentId) => {
  const response = await api.post(
    `/documents/${documentId}/process`
  );

  return response.data;
};

/* =========================================================
   DOCUMENT CHUNKS
========================================================= */

export const getDocumentChunks = async (documentId) => {
  const response = await api.get(
    `/documents/${documentId}/chunks`
  );

  return response.data;
};

/* =========================================================
   EMBEDDINGS
========================================================= */

export const generateEmbeddings = async (documentId) => {
  const response = await api.post(
    `/embeddings/documents/${documentId}/generate`
  );

  return response.data;
};

export const getEmbeddingStatus = async (documentId) => {
  const response = await api.get(
    `/embeddings/documents/${documentId}/status`
  );

  return response.data;
};

/* =========================================================
   SEMANTIC SEARCH
========================================================= */

export const searchDocuments = async (
  query,
  companyId = 1,
  topK = 5
) => {
  const response = await api.get("/search/documents", {
    params: {
      q: query,
      company_id: companyId,
      top_k: topK,
    },
  });

  return response.data;
};

/* =========================================================
   RAG
========================================================= */

export const askRag = async (
  question,
  companyId = 1
) => {
  const response = await api.post("/ai/rag/ask", {
    question,
    company_id: companyId,
  });

  return response.data;
};