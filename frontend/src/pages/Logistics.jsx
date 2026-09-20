import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  MapPin,
  Container,
  BrainCircuit,
  ArrowRight,
  X,
} from "lucide-react";

import {
  listShipments,
  getShipment,
  getShipmentIntelligence,
} from "../api/logistics";

import api from "../api/client";
import "./Logistics.css";

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    icon: Clock3,
  },
  BOOKED: {
    label: "Booked",
    icon: Package,
  },
  IN_TRANSIT: {
    label: "In Transit",
    icon: Truck,
  },
  DELIVERED: {
    label: "Delivered",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
  },
};

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

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    icon: Clock3,
  };

  const Icon = config.icon;

  return (
    <span className={`logistics-status status-${String(status).toLowerCase()}`}>
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function RiskBadge({ level }) {
  const normalized = String(level || "UNKNOWN").toUpperCase();

  return (
    <span
      className={`risk-badge risk-${normalized.toLowerCase()}`}
    >
      {normalized}
    </span>
  );
}

function KpiCard({ title, value, description, icon: Icon }) {
  return (
    <div className="logistics-kpi-card">
      <div className="logistics-kpi-top">
        <div>
          <span className="logistics-kpi-title">{title}</span>
          <strong>{value}</strong>
        </div>

        <div className="logistics-kpi-icon">
          <Icon size={21} />
        </div>
      </div>

      <p>{description}</p>
    </div>
  );
}

export default function Logistics() {
  const [shipments, setShipments] = useState([]);
  const [filteredShipments, setFilteredShipments] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentDetails, setShipmentDetails] = useState(null);

  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const loadShipments = async (showRefresh = false) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await listShipments();

      const normalized = Array.isArray(data)
        ? data
        : data?.items || data?.shipments || [];

      setShipments(normalized);
    } catch (err) {
      console.error("Failed to load shipments:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load shipments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    const query = search.trim().toLowerCase();

    const result = shipments.filter((shipment) => {
      const matchesSearch =
        !query ||
        String(shipment.shipment_number || "")
          .toLowerCase()
          .includes(query) ||
        String(shipment.origin_port || "")
          .toLowerCase()
          .includes(query) ||
        String(shipment.destination_port || "")
          .toLowerCase()
          .includes(query) ||
        String(shipment.sales_order_id || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(shipment.status).toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    setFilteredShipments(result);
  }, [shipments, search, statusFilter]);

  const metrics = useMemo(() => {
    const total = shipments.length;

    const booked = shipments.filter(
      (s) => s.status === "BOOKED"
    ).length;

    const inTransit = shipments.filter(
      (s) => s.status === "IN_TRANSIT"
    ).length;

    const delivered = shipments.filter(
      (s) => s.status === "DELIVERED"
    ).length;

    const draft = shipments.filter(
      (s) => s.status === "DRAFT"
    ).length;

    return {
      total,
      booked,
      inTransit,
      delivered,
      draft,
    };
  }, [shipments]);

  const openShipment = async (shipment) => {
    try {
      setSelectedShipment(shipment);
      setShipmentDetails(null);
      setIntelligence(null);
      setIntelligenceLoading(true);

      const [details, ai] = await Promise.all([
        getShipment(shipment.id),
        getShipmentIntelligence(shipment.id),
      ]);

      setShipmentDetails(details);
      setIntelligence(ai);
    } catch (err) {
      console.error("Failed to load shipment details:", err);

      setShipmentDetails(shipment);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load shipment intelligence."
      );
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const refreshIntelligence = async () => {
    if (!selectedShipment) return;

    try {
      setIntelligenceLoading(true);

      const ai = await getShipmentIntelligence(
        selectedShipment.id
      );

      setIntelligence(ai);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to refresh AI intelligence."
      );
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const updateShipmentStatus = async (id, action) => {
    try {
      setActionLoading(true);
      setError("");

      /*
       * Existing backend logistics actions:
       * BOOKED      -> /shipments/{id}/book
       * IN_TRANSIT  -> /shipments/{id}/transit
       * DELIVERED   -> /shipments/{id}/deliver
       */

      await api.post(`/shipments/${id}/${action}`);

      await loadShipments(true);

      const updated = await getShipment(id);

      setSelectedShipment(updated);
      setShipmentDetails(updated);

      const ai = await getShipmentIntelligence(id);
      setIntelligence(ai);
    } catch (err) {
      console.error("Shipment status update failed:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to update shipment status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedShipment(null);
    setShipmentDetails(null);
    setIntelligence(null);
  };

  const canBook =
    selectedShipment?.status === "DRAFT";

  const canTransit =
    selectedShipment?.status === "BOOKED";

  const canDeliver =
    selectedShipment?.status === "IN_TRANSIT";

  if (loading) {
    return (
      <div className="logistics-page">
        <div className="logistics-loading">
          <div className="loading-spinner" />
          <h3>Loading Logistics Workspace...</h3>
          <p>Connecting to the NEXUS shipment intelligence layer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="logistics-page">
      {/* HEADER */}
      <div className="logistics-header">
        <div>
          <div className="logistics-eyebrow">
            <Truck size={15} />
            OPERATIONS / LOGISTICS
          </div>

          <h1>Logistics Workspace</h1>

          <p>
            Monitor shipments, containers and AI-powered logistics
            intelligence from one operational workspace.
          </p>
        </div>

        <button
          className="logistics-refresh-btn"
          onClick={() => loadShipments(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="logistics-error">
          <AlertTriangle size={18} />
          <span>{error}</span>

          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI */}
      <div className="logistics-kpi-grid">
        <KpiCard
          title="Total Shipments"
          value={metrics.total}
          description="All shipments in the workspace"
          icon={Truck}
        />

        <KpiCard
          title="Booked"
          value={metrics.booked}
          description="Ready for transportation"
          icon={Package}
        />

        <KpiCard
          title="In Transit"
          value={metrics.inTransit}
          description="Currently moving"
          icon={MapPin}
        />

        <KpiCard
          title="Delivered"
          value={metrics.delivered}
          description="Successfully completed"
          icon={CheckCircle2}
        />
      </div>

      {/* STATUS SUMMARY */}
      <div className="logistics-summary-card">
        <div className="logistics-summary-heading">
          <div>
            <span>SHIPMENT PIPELINE</span>
            <h2>Operational Status</h2>
          </div>

          <Truck size={24} />
        </div>

        <div className="shipment-pipeline">
          <div className="pipeline-item">
            <span className="pipeline-dot draft" />
            <div>
              <strong>{metrics.draft}</strong>
              <small>Draft</small>
            </div>
          </div>

          <ArrowRight size={17} />

          <div className="pipeline-item">
            <span className="pipeline-dot booked" />
            <div>
              <strong>{metrics.booked}</strong>
              <small>Booked</small>
            </div>
          </div>

          <ArrowRight size={17} />

          <div className="pipeline-item">
            <span className="pipeline-dot transit" />
            <div>
              <strong>{metrics.inTransit}</strong>
              <small>In Transit</small>
            </div>
          </div>

          <ArrowRight size={17} />

          <div className="pipeline-item">
            <span className="pipeline-dot delivered" />
            <div>
              <strong>{metrics.delivered}</strong>
              <small>Delivered</small>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="logistics-table-card">
        <div className="logistics-table-header">
          <div>
            <span>SHIPMENT MANAGEMENT</span>
            <h2>Shipments</h2>
          </div>

          <div className="logistics-controls">
            <div className="logistics-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shipment, port, SO..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT">
                In Transit
              </option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredShipments.length === 0 ? (
          <div className="logistics-empty">
            <Truck size={42} />
            <h3>No shipments found</h3>
            <p>
              {shipments.length === 0
                ? "No shipments have been created yet."
                : "Try changing your search or status filter."}
            </p>
          </div>
        ) : (
          <div className="logistics-table-wrapper">
            <table className="logistics-table">
              <thead>
                <tr>
                  <th>Shipment</th>
                  <th>Sales Order</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>AI</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <div className="shipment-number">
                        <div className="shipment-icon">
                          <Truck size={17} />
                        </div>

                        <div>
                          <strong>
                            {shipment.shipment_number ||
                              `SH-${String(
                                shipment.id
                              ).padStart(6, "0")}`}
                          </strong>

                          <small>
                            ID #{shipment.id}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="sales-order-link">
                        SO-
                        {String(
                          shipment.sales_order_id || 0
                        ).padStart(6, "0")}
                      </span>
                    </td>

                    <td>
                      <div className="route-cell">
                        <span>
                          {shipment.origin_port || "—"}
                        </span>

                        <ArrowRight size={14} />

                        <span>
                          {shipment.destination_port ||
                            "—"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <StatusBadge status={shipment.status} />
                    </td>

                    <td>
                      {formatDate(shipment.created_at)}
                    </td>

                    <td>
                      <button
                        className="ai-small-btn"
                        onClick={() =>
                          openShipment(shipment)
                        }
                      >
                        <BrainCircuit size={15} />
                        Analyze
                      </button>
                    </td>

                    <td>
                      <button
                        className="view-shipment-btn"
                        onClick={() =>
                          openShipment(shipment)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="logistics-table-footer">
          Showing{" "}
          <strong>{filteredShipments.length}</strong>{" "}
          of <strong>{shipments.length}</strong> shipments
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedShipment && (
        <div
          className="logistics-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="logistics-modal">
            <div className="logistics-modal-header">
              <div>
                <span>SHIPMENT DETAILS</span>

                <h2>
                  {selectedShipment.shipment_number ||
                    `SH-${String(
                      selectedShipment.id
                    ).padStart(6, "0")}`}
                </h2>
              </div>

              <button
                className="modal-close-btn"
                onClick={closeModal}
              >
                <X size={19} />
              </button>
            </div>

            <div className="shipment-detail-status">
              <StatusBadge
                status={selectedShipment.status}
              />

              <span>
                Created{" "}
                {formatDate(
                  selectedShipment.created_at
                )}
              </span>
            </div>

            {/* ROUTE */}
            <div className="shipment-route-card">
              <div className="route-point">
                <div className="route-icon">
                  <MapPin size={18} />
                </div>

                <div>
                  <small>ORIGIN</small>
                  <strong>
                    {selectedShipment.origin_port ||
                      "—"}
                  </strong>
                </div>
              </div>

              <div className="route-line">
                <ArrowRight size={18} />
              </div>

              <div className="route-point">
                <div className="route-icon">
                  <MapPin size={18} />
                </div>

                <div>
                  <small>DESTINATION</small>
                  <strong>
                    {selectedShipment.destination_port ||
                      "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* BASIC DETAILS */}
            <div className="shipment-info-grid">
              <div>
                <span>Shipment ID</span>
                <strong>
                  #{selectedShipment.id}
                </strong>
              </div>

              <div>
                <span>Sales Order</span>
                <strong>
                  SO-
                  {String(
                    selectedShipment.sales_order_id ||
                      0
                  ).padStart(6, "0")}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {selectedShipment.status}
                </strong>
              </div>

              <div>
                <span>Container Count</span>
                <strong>
                  {shipmentDetails?.containers?.length ??
                    shipmentDetails?.container_count ??
                    intelligence?.container_count ??
                    0}
                </strong>
              </div>
            </div>

            {/* CONTAINERS */}
            <div className="shipment-section">
              <div className="shipment-section-heading">
                <div>
                  <span>LOGISTICS ASSETS</span>
                  <h3>Containers</h3>
                </div>

                <Container size={20} />
              </div>

              {shipmentDetails?.containers?.length ? (
                <div className="container-list">
                  {shipmentDetails.containers.map(
                    (container) => (
                      <div
                        className="container-item"
                        key={container.id}
                      >
                        <Container size={18} />

                        <div>
                          <strong>
                            {container.container_number}
                          </strong>

                          <small>
                            {container.container_type ||
                              "Standard"}{" "}
                            ·{" "}
                            {container.status}
                          </small>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="no-containers">
                  <Container size={20} />
                  <span>
                    No container records available.
                  </span>
                </div>
              )}
            </div>

            {/* AI */}
            <div className="shipment-section ai-section">
              <div className="shipment-section-heading">
                <div>
                  <span>AI OPERATIONS INTELLIGENCE</span>
                  <h3>Shipment Risk Analysis</h3>
                </div>

                <BrainCircuit size={21} />
              </div>

              {intelligenceLoading ? (
                <div className="ai-loading">
                  <div className="loading-spinner" />
                  <span>
                    Running shipment intelligence...
                  </span>
                </div>
              ) : intelligence ? (
                <>
                  <div className="ai-risk-overview">
                    <div className="ai-risk-score">
                      <small>DELAY RISK</small>

                      <strong>
                        {intelligence.delay_risk_score ??
                          0}
                      </strong>

                      <span>/ 100</span>
                    </div>

                    <div>
                      <small>RISK LEVEL</small>

                      <div>
                        <RiskBadge
                          level={
                            intelligence.risk_level
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <small>SHIPMENT AGE</small>

                      <strong>
                        {intelligence.shipment_age_days ??
                          0}{" "}
                        days
                      </strong>
                    </div>

                    <div>
                      <small>IN-TRANSIT CONTAINERS</small>

                      <strong>
                        {intelligence.in_transit_containers ??
                          0}
                      </strong>
                    </div>
                  </div>

                  {intelligence.reasons?.length > 0 && (
                    <div className="ai-reasons">
                      <strong>Analysis</strong>

                      <ul>
                        {intelligence.reasons.map(
                          (reason, index) => (
                            <li key={index}>
                              <CheckCircle2 size={15} />
                              {reason}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {intelligence.recommendation && (
                    <div className="ai-recommendation">
                      <BrainCircuit size={18} />

                      <div>
                        <strong>
                          AI Recommendation
                        </strong>

                        <p>
                          {intelligence.recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="ai-actions">
                    <button
                      onClick={refreshIntelligence}
                      disabled={intelligenceLoading}
                    >
                      <RefreshCw size={15} />
                      Refresh Analysis
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-ai">
                  AI intelligence is unavailable for
                  this shipment.
                </div>
              )}
            </div>

            {/* STATUS ACTIONS */}
            <div className="shipment-section">
              <div className="shipment-section-heading">
                <div>
                  <span>OPERATIONS</span>
                  <h3>Shipment Actions</h3>
                </div>

                <Truck size={20} />
              </div>

              <div className="shipment-actions">
                {canBook && (
                  <button
                    className="action-primary"
                    onClick={() =>
                      updateShipmentStatus(
                        selectedShipment.id,
                        "book"
                      )
                    }
                    disabled={actionLoading}
                  >
                    <Package size={17} />
                    {actionLoading
                      ? "Processing..."
                      : "Book Shipment"}
                  </button>
                )}

                {canTransit && (
                  <button
                    className="action-primary"
                    onClick={() =>
                      updateShipmentStatus(
                        selectedShipment.id,
                        "transit"
                      )
                    }
                    disabled={actionLoading}
                  >
                    <Truck size={17} />
                    {actionLoading
                      ? "Processing..."
                      : "Move to In Transit"}
                  </button>
                )}

                {canDeliver && (
                  <button
                    className="action-primary"
                    onClick={() =>
                      updateShipmentStatus(
                        selectedShipment.id,
                        "deliver"
                      )
                    }
                    disabled={actionLoading}
                  >
                    <CheckCircle2 size={17} />
                    {actionLoading
                      ? "Processing..."
                      : "Mark Delivered"}
                  </button>
                )}

                {!canBook &&
                  !canTransit &&
                  !canDeliver && (
                    <div className="shipment-complete">
                      <CheckCircle2 size={17} />
                      No further status action is
                      available for this shipment.
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}