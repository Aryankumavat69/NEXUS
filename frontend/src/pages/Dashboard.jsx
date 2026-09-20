import { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Package,
  Truck,
  ReceiptIndianRupee,
  Factory,
  Boxes,
  AlertTriangle,
  ShieldCheck,
  Activity,
  RefreshCw,
} from "lucide-react";

import { getDashboardData } from "../api/dashboard";
import { getInventoryIntelligence } from "../api/inventory";
import { getShipmentIntelligence } from "../api/logistics";
import { useAuth } from "../auth/AuthContext";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon">
          <Icon size={19} />
        </div>
      </div>

      <div className="stat-title">{title}</div>

      <div className="stat-value">{value}</div>

      <div className="stat-description">
        {description}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getDashboardData();

      setData(result);

      loadAIInsights(result);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAIInsights = async (dashboardData) => {
    try {
      setAiLoading(true);

      const insights = [];

      const inventory =
        dashboardData.inventory || [];

      const shipments =
        dashboardData.shipments || [];

      /*
       * INVENTORY AI
       */
      for (const item of inventory.slice(0, 5)) {
        try {
          const result =
            await getInventoryIntelligence(
              item.product_id
            );

          insights.push({
            type: "inventory",
            title:
              result.risk_level === "HIGH"
                ? "Inventory risk detected"
                : "Inventory intelligence",

            detail:
              result.recommendation ||
              "Inventory is currently within expected conditions.",

            risk:
              result.risk_level || "LOW",
          });
        } catch {
          // Ignore individual AI failures.
        }
      }

      /*
       * SHIPMENT AI
       */
      for (const shipment of shipments.slice(0, 3)) {
        try {
          const result =
            await getShipmentIntelligence(
              shipment.id
            );

          insights.push({
            type: "shipment",
            title: "Shipment intelligence",

            detail:
              result.recommendation ||
              "Shipment is currently within expected operational conditions.",

            risk:
              result.risk_level || "LOW",
          });
        } catch {
          // Ignore individual AI failures.
        }
      }

      setAiInsights(insights.slice(0, 4));
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    if (!data) {
      return {
        revenue: 0,
        orders: 0,
        inventoryUnits: 0,
        activeShipments: 0,
        suppliers: 0,
      };
    }

    const salesOrders =
      data.salesOrders || [];

    const inventory =
      data.inventory || [];

    const shipments =
      data.shipments || [];

    const suppliers =
      data.suppliers || [];

    const invoices =
      data.invoices || [];

    /*
     * Use invoice totals where available.
     * Fall back to sales order totals.
     */
    const invoiceRevenue = invoices.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.total_amount || 0
        ),
      0
    );

    const salesRevenue = salesOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total_amount || 0
        ),
      0
    );

    const revenue =
      invoiceRevenue > 0
        ? invoiceRevenue
        : salesRevenue;

    const inventoryUnits =
      inventory.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0),
        0
      );

    const activeShipments =
      shipments.filter(
        (shipment) =>
          shipment.status === "BOOKED" ||
          shipment.status === "IN_TRANSIT"
      ).length;

    return {
      revenue,
      orders: salesOrders.length,
      inventoryUnits,
      activeShipments,
      suppliers: suppliers.length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <RefreshCw
          size={28}
          className="loading-spin"
        />

        <h2>Loading NEXUS intelligence...</h2>

        <p>
          Synchronizing enterprise operations data.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={30} />

        <h2>Dashboard unavailable</h2>

        <p>{error}</p>

        <button
          className="primary-button"
          onClick={loadDashboard}
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* HEADER */}
      <section className="welcome-row">
        <div>
          <p className="eyebrow">
            ENTERPRISE COMMAND CENTER
          </p>

          <h2>
            Good afternoon,{" "}
            {user?.name ||
              user?.full_name ||
              user?.email?.split("@")[0] ||
              "Admin"}
            .
          </h2>

          <p className="welcome-text">
            Live operational intelligence from
            your NEXUS enterprise backend.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={loadDashboard}
        >
          <RefreshCw size={17} />
          Refresh Data
        </button>
      </section>

      {/* REAL KPI DATA */}
      <section className="stats-grid">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(
            metrics.revenue
          )}
          description="From enterprise invoices"
          icon={ReceiptIndianRupee}
        />

        <StatCard
          title="Sales Orders"
          value={metrics.orders}
          description="Orders in NEXUS"
          icon={ShoppingCart}
        />

        <StatCard
          title="Inventory Units"
          value={metrics.inventoryUnits}
          description="Current recorded stock"
          icon={Boxes}
        />

        <StatCard
          title="Active Shipments"
          value={metrics.activeShipments}
          description="Booked + in transit"
          icon={Truck}
        />
      </section>

      {/* OPERATIONAL SUMMARY */}
      <section className="lower-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                Operations Snapshot
              </div>

              <div className="panel-subtitle">
                Live backend records
              </div>
            </div>
          </div>

          <div className="insights">
            <div className="insight-item">
              <div className="insight-icon info">
                <ShoppingCart size={18} />
              </div>

              <div className="insight-content">
                <strong>
                  Sales Operations
                </strong>

                <p>
                  {metrics.orders} sales orders
                  currently recorded.
                </p>
              </div>
            </div>

            <div className="insight-item">
              <div className="insight-icon success">
                <Package size={18} />
              </div>

              <div className="insight-content">
                <strong>
                  Inventory Operations
                </strong>

                <p>
                  {metrics.inventoryUnits} total
                  inventory units recorded.
                </p>
              </div>
            </div>

            <div className="insight-item">
              <div className="insight-icon info">
                <Factory size={18} />
              </div>

              <div className="insight-content">
                <strong>
                  Procurement Network
                </strong>

                <p>
                  {metrics.suppliers} suppliers
                  available in the system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">
                AI Intelligence
              </div>

              <div className="panel-subtitle">
                Live model analysis
              </div>
            </div>

            {aiLoading && (
              <RefreshCw
                size={16}
                className="loading-spin"
              />
            )}
          </div>

          <div className="insights">
            {aiInsights.length === 0 && (
              <div className="insight-item">
                <div className="insight-icon success">
                  <ShieldCheck size={18} />
                </div>

                <div className="insight-content">
                  <strong>
                    No AI alerts available
                  </strong>

                  <p>
                    Current operational data has
                    no available AI warnings.
                  </p>
                </div>
              </div>
            )}

            {aiInsights.map(
              (insight, index) => (
                <div
                  className="insight-item"
                  key={`${insight.type}-${index}`}
                >
                  <div
                    className={`insight-icon ${
                      insight.risk === "HIGH"
                        ? "warning"
                        : "success"
                    }`}
                  >
                    {insight.risk ===
                    "HIGH" ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                  </div>

                  <div className="insight-content">
                    <strong>
                      {insight.title}
                    </strong>

                    <p>
                      {insight.detail}
                    </p>
                  </div>

                  <span
                    className={`risk-label ${
                      insight.risk === "HIGH"
                        ? "medium"
                        : "low"
                    }`}
                  >
                    {insight.risk}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* LIVE DATA TABLE */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              Recent Sales Orders
            </div>

            <div className="panel-subtitle">
              Live records from FastAPI
            </div>
          </div>

          <Activity size={18} />
        </div>

        <div className="activity-list">
          {(data?.salesOrders || [])
            .slice(0, 6)
            .map((order) => (
              <div
                className="activity-item"
                key={order.id}
              >
                <div className="activity-icon">
                  <ShoppingCart size={16} />
                </div>

                <div className="activity-content">
                  <strong>
                    {order.order_number ||
                      `Order #${order.id}`}
                  </strong>

                  <span>
                    {order.status || "UNKNOWN"} ·{" "}
                    {formatCurrency(
                      order.total_amount
                    )}
                  </span>
                </div>

                <div className="activity-time">
                  {order.currency || "INR"}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}