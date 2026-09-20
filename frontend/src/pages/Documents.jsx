import { useEffect, useMemo, useRef, useState } from "react";

import {
  FileText,
  Upload,
  Search,
  BrainCircuit,
  Database,
  RefreshCw,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  X,
  Sparkles,
  FileSearch,
  Send,
  ChevronRight,
  LoaderCircle,
  Layers3,
} from "lucide-react";

import {
  listDocuments,
  getDocument,
  uploadDocument,
  processDocument,
  getDocumentChunks,
  generateEmbeddings,
  getEmbeddingStatus,
  searchDocuments,
  askRag,
} from "../api/documents";

import "./Documents.css";


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}


function formatSimilarity(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "—";
  }

  return `${(number * 100).toFixed(1)}%`;
}


function getStatusClass(status) {
  return String(status || "UNKNOWN")
    .toLowerCase()
    .replaceAll("_", "-");
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalized = String(status || "UNKNOWN").toUpperCase();

  let Icon = Clock3;

  if (
    normalized === "PROCESSED" ||
    normalized === "COMPLETED"
  ) {
    Icon = CheckCircle2;
  }

  if (
    normalized === "PROCESSING" ||
    normalized === "UPLOADED"
  ) {
    Icon = Clock3;
  }

  if (
    normalized.includes("FAILED") ||
    normalized === "ERROR"
  ) {
    Icon = AlertTriangle;
  }

  return (
    <span
      className={`document-status status-${getStatusClass(
        normalized
      )}`}
    >
      <Icon size={13} />
      {normalized.replaceAll("_", " ")}
    </span>
  );
}


/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="documents-kpi-card">
      <div className="documents-kpi-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>

      <div className="documents-kpi-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Documents() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);

  const [selectedDocument, setSelectedDocument] =
    useState(null);

  const [selectedChunks, setSelectedChunks] =
    useState([]);

  const [embeddingStatus, setEmbeddingStatus] =
    useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [ragQuestion, setRagQuestion] = useState("");
  const [ragAnswer, setRagAnswer] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [embeddingId, setEmbeddingId] = useState(null);
  const [detailsLoading, setDetailsLoading] =
    useState(false);
  const [searching, setSearching] = useState(false);
  const [asking, setAsking] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const COMPANY_ID = 1;


  /* =======================================================
     LOAD DOCUMENTS
  ======================================================= */

  const loadDocuments = async (
    showRefresh = false
  ) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      }

      const data = await listDocuments(COMPANY_ID);

      const normalized = Array.isArray(data)
        ? data
        : data?.items ||
          data?.documents ||
          [];

      setDocuments(normalized);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load documents."
      );
    } finally {
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadDocuments();
  }, []);


  /* =======================================================
     DOCUMENT METRICS
  ======================================================= */

  const metrics = useMemo(() => {
    const total = documents.length;

    const processed = documents.filter(
      (document) =>
        String(document.status).toUpperCase() ===
        "PROCESSED"
    ).length;

    const processing = documents.filter(
      (document) =>
        String(document.status).toUpperCase() ===
        "PROCESSING"
    ).length;

    const failed = documents.filter((document) =>
      String(document.status)
        .toUpperCase()
        .includes("FAILED")
    ).length;

    return {
      total,
      processed,
      processing,
      failed,
    };
  }, [documents]);


  /* =======================================================
     FILE UPLOAD
  ======================================================= */

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };


  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");

      const uploaded = await uploadDocument(
        file,
        COMPANY_ID
      );

      await loadDocuments();

      if (uploaded?.id) {
        await openDocument({
          id: uploaded.id,
          ...uploaded,
        });
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Document upload failed."
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  /* =======================================================
     OPEN DOCUMENT
  ======================================================= */

  const openDocument = async (document) => {
    try {
      setDetailsLoading(true);
      setError("");

      setSelectedDocument(document);
      setSelectedChunks([]);
      setEmbeddingStatus(null);

      const [details, chunks, embeddings] =
        await Promise.all([
          getDocument(document.id),
          getDocumentChunks(document.id),
          getEmbeddingStatus(document.id),
        ]);

      setSelectedDocument(details);
      setSelectedChunks(
        Array.isArray(chunks)
          ? chunks
          : chunks?.items ||
              chunks?.chunks ||
              []
      );

      setEmbeddingStatus(embeddings);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load document details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };


  /* =======================================================
     PROCESS
  ======================================================= */

  const handleProcess = async (documentId) => {
    try {
      setProcessingId(documentId);
      setError("");

      await processDocument(documentId);

      await loadDocuments();

      if (selectedDocument?.id === documentId) {
        await openDocument({
          ...selectedDocument,
          id: documentId,
        });
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Document processing failed."
      );
    } finally {
      setProcessingId(null);
    }
  };


  /* =======================================================
     EMBEDDINGS
  ======================================================= */

  const handleGenerateEmbeddings = async (
    documentId
  ) => {
    try {
      setEmbeddingId(documentId);
      setError("");

      await generateEmbeddings(documentId);

      const status =
        await getEmbeddingStatus(documentId);

      setEmbeddingStatus(status);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Embedding generation failed."
      );
    } finally {
      setEmbeddingId(null);
    }
  };


  /* =======================================================
     SEMANTIC SEARCH
  ======================================================= */

  const handleSearch = async (event) => {
    event?.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    try {
      setSearching(true);
      setError("");

      const data = await searchDocuments(
        searchQuery.trim(),
        COMPANY_ID,
        8
      );

      const results = Array.isArray(data)
        ? data
        : data?.results ||
          data?.items ||
          [];

      setSearchResults(results);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Semantic search failed."
      );
    } finally {
      setSearching(false);
    }
  };


  /* =======================================================
     RAG
  ======================================================= */

  const handleRag = async (event) => {
    event?.preventDefault();

    if (!ragQuestion.trim()) {
      return;
    }

    try {
      setAsking(true);
      setError("");

      const result = await askRag(
        ragQuestion.trim(),
        COMPANY_ID
      );

      setRagAnswer(result);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "RAG request failed."
      );
    } finally {
      setAsking(false);
    }
  };


  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeDocument = () => {
    setSelectedDocument(null);
    setSelectedChunks([]);
    setEmbeddingStatus(null);
  };


  return (
    <div className="documents-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="documents-header">
        <div>
          <div className="documents-eyebrow">
            <BrainCircuit size={15} />
            AI / DOCUMENT INTELLIGENCE
          </div>

          <h1>Documents & RAG</h1>

          <p>
            Process enterprise documents, generate
            embeddings, perform semantic search and
            interact with the NEXUS AI knowledge layer.
          </p>
        </div>

        <div className="documents-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            hidden
            onChange={handleFileUpload}
          />

          <button
            className="documents-refresh-btn"
            onClick={() => loadDocuments(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing ? "documents-spin" : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            className="documents-upload-btn"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? (
              <LoaderCircle
                size={17}
                className="documents-spin"
              />
            ) : (
              <Upload size={17} />
            )}

            {uploading
              ? "Uploading..."
              : "Upload Document"}
          </button>
        </div>
      </div>


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="documents-error">
          <AlertTriangle size={18} />

          <span>{error}</span>

          <button
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* ===================================================
          KPI
      =================================================== */}

      <div className="documents-kpi-grid">

        <KpiCard
          title="Total Documents"
          value={metrics.total}
          description="Documents stored in NEXUS"
          icon={FileText}
        />

        <KpiCard
          title="Processed"
          value={metrics.processed}
          description="Ready for intelligence"
          icon={CheckCircle2}
        />

        <KpiCard
          title="Processing"
          value={metrics.processing}
          description="Currently being processed"
          icon={Clock3}
        />

        <KpiCard
          title="Failed"
          value={metrics.failed}
          description="Documents requiring attention"
          icon={AlertTriangle}
        />

      </div>


      {/* ===================================================
          DOCUMENT MANAGEMENT
      =================================================== */}

      <div className="documents-main-card">

        <div className="documents-section-header">

          <div>
            <span>KNOWLEDGE BASE</span>
            <h2>Enterprise Documents</h2>
          </div>

          <FileSearch size={22} />

        </div>


        {documents.length === 0 ? (
          <div className="documents-empty">

            <FileText size={45} />

            <h3>
              No documents available
            </h3>

            <p>
              Upload a PDF, DOCX or TXT document
              to begin building the NEXUS knowledge base.
            </p>

            <button
              onClick={handleUploadClick}
            >
              <Upload size={16} />
              Upload First Document
            </button>

          </div>
        ) : (
          <div className="documents-table-wrapper">

            <table className="documents-table">

              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Pipeline</th>
                  <th />
                </tr>
              </thead>

              <tbody>

                {documents.map((document) => {

                  const processed =
                    String(document.status)
                      .toUpperCase() ===
                    "PROCESSED";

                  return (
                    <tr key={document.id}>

                      <td>
                        <div className="document-name-cell">

                          <div className="document-icon">
                            <FileText size={18} />
                          </div>

                          <div>
                            <strong>
                              {document.title ||
                                document.file_name ||
                                `Document #${document.id}`}
                            </strong>

                            <small>
                              {document.file_name ||
                                "—"}
                            </small>
                          </div>

                        </div>
                      </td>

                      <td>
                        {document.document_type ||
                          "GENERAL"}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            document.status ||
                            "UPLOADED"
                          }
                        />
                      </td>

                      <td>
                        {formatDate(
                          document.created_at
                        )}
                      </td>

                      <td>

                        <div className="document-pipeline">

                          <span
                            className={
                              processed
                                ? "pipeline-complete"
                                : ""
                            }
                          >
                            Upload
                          </span>

                          <ChevronRight size={13} />

                          <span
                            className={
                              processed
                                ? "pipeline-complete"
                                : ""
                            }
                          >
                            Process
                          </span>

                          <ChevronRight size={13} />

                          <span>
                            Embed
                          </span>

                        </div>

                      </td>

                      <td>

                        <div className="document-row-actions">

                          {!processed && (
                            <button
                              className="document-action-btn"
                              onClick={() =>
                                handleProcess(
                                  document.id
                                )
                              }
                              disabled={
                                processingId ===
                                document.id
                              }
                            >
                              {processingId ===
                              document.id ? (
                                <LoaderCircle
                                  size={14}
                                  className="documents-spin"
                                />
                              ) : (
                                <Layers3
                                  size={14}
                                />
                              )}

                              {processingId ===
                              document.id
                                ? "Processing"
                                : "Process"}
                            </button>
                          )}

                          <button
                            className="document-view-btn"
                            onClick={() =>
                              openDocument(document)
                            }
                          >
                            View
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>


      {/* ===================================================
          AI SEARCH
      =================================================== */}

      <div className="documents-ai-grid">

        {/* SEMANTIC SEARCH */}

        <div className="documents-ai-card">

          <div className="documents-ai-card-header">

            <div>
              <span>VECTOR SEARCH</span>
              <h2>Semantic Search</h2>
            </div>

            <Database size={21} />

          </div>

          <p className="documents-ai-description">
            Search indexed documents using natural
            language and pgvector similarity.
          </p>


          <form
            className="document-search-form"
            onSubmit={handleSearch}
          >

            <Search size={18} />

            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Ask about your documents..."
            />

            <button
              type="submit"
              disabled={
                searching ||
                !searchQuery.trim()
              }
            >
              {searching ? (
                <LoaderCircle
                  size={16}
                  className="documents-spin"
                />
              ) : (
                <Search size={16} />
              )}

              Search
            </button>

          </form>


          {searchResults.length > 0 && (
            <div className="search-results">

              <div className="search-results-title">
                <strong>
                  Search Results
                </strong>

                <span>
                  {searchResults.length} matches
                </span>
              </div>

              {searchResults.map(
                (result, index) => (

                  <div
                    className="search-result"
                    key={
                      result.id ||
                      result.chunk_id ||
                      index
                    }
                  >

                    <div className="search-result-top">

                      <div>
                        <FileText size={15} />

                        <strong>
                          {result.document_title ||
                            result.title ||
                            result.file_name ||
                            "Document"}
                        </strong>
                      </div>

                      <span>
                        {formatSimilarity(
                          result.similarity
                        )}
                      </span>

                    </div>

                    <p>
                      {result.content ||
                        result.chunk_content ||
                        result.text ||
                        "No matching content returned."}
                    </p>

                  </div>

                )
              )}

            </div>
          )}

        </div>


        {/* RAG ASSISTANT */}

        <div className="documents-ai-card rag-card">

          <div className="documents-ai-card-header">

            <div>
              <span>GENERATIVE AI</span>
              <h2>NEXUS RAG Assistant</h2>
            </div>

            <Sparkles size={21} />

          </div>

          <p className="documents-ai-description">
            Ask questions and receive answers grounded
            in your indexed enterprise documents.
          </p>


          <form
            className="rag-form"
            onSubmit={handleRag}
          >

            <textarea
              value={ragQuestion}
              onChange={(event) =>
                setRagQuestion(
                  event.target.value
                )
              }
              placeholder="Example: What are the payment terms in the TechSupply contract?"
              rows={4}
            />

            <button
              type="submit"
              disabled={
                asking ||
                !ragQuestion.trim()
              }
            >
              {asking ? (
                <LoaderCircle
                  size={16}
                  className="documents-spin"
                />
              ) : (
                <Send size={16} />
              )}

              {asking
                ? "Thinking..."
                : "Ask NEXUS AI"}
            </button>

          </form>


          {ragAnswer && (
            <div className="rag-answer">

              <div className="rag-answer-header">

                <div>
                  <BrainCircuit size={18} />

                  <strong>
                    NEXUS AI Answer
                  </strong>
                </div>

                {ragAnswer.confidence !==
                  undefined && (
                  <span>
                    Confidence:{" "}
                    {formatSimilarity(
                      ragAnswer.confidence
                    )}
                  </span>
                )}

              </div>


              <div className="rag-answer-content">
                {ragAnswer.answer ||
                  ragAnswer.response ||
                  ragAnswer.content ||
                  "No answer returned."}
              </div>


              {(
                ragAnswer.sources ||
                ragAnswer.source_documents ||
                []
              ).length > 0 && (

                <div className="rag-sources">

                  <strong>
                    Sources
                  </strong>

                  {(
                    ragAnswer.sources ||
                    ragAnswer.source_documents ||
                    []
                  ).map(
                    (source, index) => (

                      <div
                        key={index}
                        className="rag-source"
                      >
                        <FileText size={14} />

                        <span>
                          {typeof source ===
                          "string"
                            ? source
                            : source.title ||
                              source.document_title ||
                              source.file_name ||
                              `Source ${index + 1}`}
                        </span>
                      </div>

                    )
                  )}

                </div>

              )}

            </div>
          )}

        </div>

      </div>


      {/* ===================================================
          DOCUMENT DETAIL MODAL
      =================================================== */}

      {selectedDocument && (

        <div
          className="documents-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDocument();
            }
          }}
        >

          <div className="documents-modal">

            <div className="documents-modal-header">

              <div>

                <span>
                  DOCUMENT INTELLIGENCE
                </span>

                <h2>
                  {selectedDocument.title ||
                    selectedDocument.file_name ||
                    `Document #${selectedDocument.id}`}
                </h2>

              </div>

              <button
                className="documents-close-btn"
                onClick={closeDocument}
              >
                <X size={18} />
              </button>

            </div>


            {detailsLoading ? (

              <div className="documents-modal-loading">

                <LoaderCircle
                  size={30}
                  className="documents-spin"
                />

                <p>
                  Loading document intelligence...
                </p>

              </div>

            ) : (

              <>

                {/* BASIC INFORMATION */}

                <div className="document-detail-grid">

                  <div>
                    <span>Document ID</span>
                    <strong>
                      #{selectedDocument.id}
                    </strong>
                  </div>

                  <div>
                    <span>File Name</span>
                    <strong>
                      {selectedDocument.file_name ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Type</span>
                    <strong>
                      {selectedDocument.document_type ||
                        "GENERAL"}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <StatusBadge
                      status={
                        selectedDocument.status
                      }
                    />
                  </div>

                  <div>
                    <span>Created</span>
                    <strong>
                      {formatDate(
                        selectedDocument.created_at
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Chunks</span>
                    <strong>
                      {selectedChunks.length}
                    </strong>
                  </div>

                </div>


                {/* PIPELINE */}

                <div className="document-intelligence-panel">

                  <div className="document-intelligence-header">

                    <div>
                      <span>
                        AI PIPELINE
                      </span>

                      <h3>
                        Document Intelligence
                      </h3>
                    </div>

                    <BrainCircuit size={20} />

                  </div>


                  <div className="intelligence-pipeline">

                    <div className="intelligence-step complete">
                      <CheckCircle2 size={17} />
                      <span>Uploaded</span>
                    </div>

                    <ChevronRight size={15} />

                    <div
                      className={
                        String(
                          selectedDocument.status
                        ).toUpperCase() ===
                        "PROCESSED"
                          ? "intelligence-step complete"
                          : "intelligence-step"
                      }
                    >
                      {String(
                        selectedDocument.status
                      ).toUpperCase() ===
                      "PROCESSED" ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Clock3 size={17} />
                      )}

                      <span>
                        Processed
                      </span>
                    </div>

                    <ChevronRight size={15} />

                    <div
                      className={
                        embeddingStatus?.count > 0 ||
                        embeddingStatus?.embedded_chunks >
                          0
                          ? "intelligence-step complete"
                          : "intelligence-step"
                      }
                    >
                      {embeddingStatus?.count > 0 ||
                      embeddingStatus?.embedded_chunks >
                        0 ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Database size={17} />
                      )}

                      <span>
                        Embedded
                      </span>
                    </div>

                    <ChevronRight size={15} />

                    <div className="intelligence-step">
                      <Sparkles size={17} />
                      <span>RAG Ready</span>
                    </div>

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="document-modal-actions">

                  <button
                    className="document-modal-primary"
                    onClick={() =>
                      handleProcess(
                        selectedDocument.id
                      )
                    }
                    disabled={
                      processingId ===
                      selectedDocument.id
                    }
                  >
                    {processingId ===
                    selectedDocument.id ? (
                      <LoaderCircle
                        size={16}
                        className="documents-spin"
                      />
                    ) : (
                      <Layers3 size={16} />
                    )}

                    {processingId ===
                    selectedDocument.id
                      ? "Processing..."
                      : "Process Document"}
                  </button>


                  <button
                    className="document-modal-secondary"
                    onClick={() =>
                      handleGenerateEmbeddings(
                        selectedDocument.id
                      )
                    }
                    disabled={
                      embeddingId ===
                      selectedDocument.id
                    }
                  >
                    {embeddingId ===
                    selectedDocument.id ? (
                      <LoaderCircle
                        size={16}
                        className="documents-spin"
                      />
                    ) : (
                      <Database size={16} />
                    )}

                    {embeddingId ===
                    selectedDocument.id
                      ? "Generating..."
                      : "Generate Embeddings"}
                  </button>

                </div>


                {/* CHUNKS */}

                <div className="document-chunks-section">

                  <div className="document-chunks-header">

                    <div>
                      <span>
                        VECTOR KNOWLEDGE
                      </span>

                      <h3>
                        Document Chunks
                      </h3>
                    </div>

                    <span>
                      {selectedChunks.length} chunks
                    </span>

                  </div>


                  {selectedChunks.length ===
                  0 ? (

                    <div className="no-document-chunks">

                      <FileSearch size={20} />

                      <span>
                        No processed chunks are
                        available yet.
                      </span>

                    </div>

                  ) : (

                    <div className="document-chunks">

                      {selectedChunks
                        .slice(0, 20)
                        .map(
                          (chunk, index) => (

                            <div
                              className="document-chunk"
                              key={
                                chunk.id ||
                                index
                              }
                            >

                              <div className="chunk-number">
                                {chunk.chunk_index ??
                                  index}
                              </div>

                              <div>
                                <strong>
                                  Chunk{" "}
                                  {chunk.chunk_index ??
                                    index}
                                </strong>

                                <p>
                                  {chunk.content ||
                                    chunk.text ||
                                    "No content available."}
                                </p>
                              </div>

                            </div>

                          )
                        )}

                    </div>

                  )}

                </div>

              </>

            )}

          </div>

        </div>

      )}

    </div>
  );
}