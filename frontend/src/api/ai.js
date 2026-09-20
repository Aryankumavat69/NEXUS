import api from "./client";

export const analyzeDecision = (entityType, entityId) =>
  api
    .get("/ai/decision/analyze", {
      params: {
        entity_type: entityType,
        entity_id: entityId,
      },
    })
    .then((res) => res.data);

export const detectSalesOrderAnomalies = () =>
  api.get("/ai/anomaly/sales-orders").then((res) => res.data);

export const getKnowledgeGraph = (salesOrderId) =>
  api
    .get(`/ai/knowledge-graph/sales-orders/${salesOrderId}`)
    .then((res) => res.data);

export const askRag = (question, companyId) =>
  api
    .post("/ai/rag/ask", {
      question,
      company_id: companyId,
    })
    .then((res) => res.data);

export const searchDocuments = (query, companyId, topK = 5) =>
  api
    .get("/search/documents", {
      params: {
        q: query,
        company_id: companyId,
        top_k: topK,
      },
    })
    .then((res) => res.data);