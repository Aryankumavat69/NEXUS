import { useEffect, useMemo, useState } from "react";
import {
  ReceiptIndianRupee,
  CreditCard,
  Wallet,
  TrendingUp,
  Search,
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  FileText,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
} from "lucide-react";

import {
  listInvoices,
  createInvoiceFromSalesOrder,
  createPayment,
  getPaymentRisk,
} from "../api/finance";

import { listSalesOrders } from "../api/sales";

import "./Finance.css";


/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value, currency = "INR") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}


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


function getInvoiceStatus(invoice) {
  const status = String(invoice.status || "").toUpperCase();

  switch (status) {
    case "PAID":
      return "PAID";

    case "PARTIALLY_PAID":
      return "PARTIALLY_PAID";

    case "OVERDUE":
      return "OVERDUE";

    case "CANCELLED":
      return "CANCELLED";

    case "DRAFT":
      return "DRAFT";

    case "ISSUED":
      return "ISSUED";

    case "PENDING":
      return "PENDING";

    default: {
      const total = Number(invoice.total_amount || 0);

      const paid = Number(
        invoice.paid_amount ||
          invoice.amount_paid ||
          0
      );

      if (paid >= total && total > 0) {
        return "PAID";
      }

      if (paid > 0) {
        return "PARTIALLY_PAID";
      }

      return "UNPAID";
    }
  }
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
  const normalized = String(
    status || "UNKNOWN"
  ).toUpperCase();

  let Icon = Clock3;

  if (
    normalized === "PAID" ||
    normalized === "COMPLETED"
  ) {
    Icon = CheckCircle2;
  }

  if (
    normalized.includes("PARTIAL") ||
    normalized === "PENDING"
  ) {
    Icon = Clock3;
  }

  if (
    normalized === "OVERDUE" ||
    normalized === "FAILED"
  ) {
    Icon = AlertTriangle;
  }

  return (
    <span
      className={`finance-status status-${getStatusClass(
        normalized
      )}`}
    >
      <Icon size={13} />
      {normalized.replaceAll("_", " ")}
    </span>
  );
}


/* =========================================================
   KPI
========================================================= */

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="finance-kpi-card">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>

      <div className="finance-kpi-icon">
        <Icon size={20} />
      </div>
    </div>
  );
}


/* =========================================================
   MAIN
========================================================= */

export default function Finance() {
  const COMPANY_ID = 1;

  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [selectedInvoice, setSelectedInvoice] =
    useState(null);

  const [showInvoiceModal, setShowInvoiceModal] =
    useState(false);

  const [showPaymentModal, setShowPaymentModal] =
    useState(false);

  const [showCreateInvoiceModal, setShowCreateInvoiceModal] =
    useState(false);

  const [selectedSalesOrderId, setSelectedSalesOrderId] =
    useState("");

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    amount: "",
    payment_method: "BANK_TRANSFER",
    reference_number: "",
  });

  const [creatingInvoice, setCreatingInvoice] =
    useState(false);

  const [creatingPayment, setCreatingPayment] =
    useState(false);

  const [paymentRisk, setPaymentRisk] =
    useState(null);

  const [riskLoading, setRiskLoading] =
    useState(false);


  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadFinance = async (
    showRefresh = false
  ) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [invoiceData, orderData] =
        await Promise.all([
          listInvoices(),
          listSalesOrders(),
        ]);

      const invoiceList = Array.isArray(
        invoiceData
      )
        ? invoiceData
        : invoiceData?.items ||
          invoiceData?.invoices ||
          [];

      const orderList = Array.isArray(orderData)
        ? orderData
        : orderData?.items ||
          orderData?.sales_orders ||
          [];

      setInvoices(invoiceList);
      setSalesOrders(orderList);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load finance data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadFinance();
  }, []);


  /* =======================================================
     METRICS
  ======================================================= */

  const metrics = useMemo(() => {
    let invoiced = 0;
    let paid = 0;
    let outstanding = 0;

    invoices.forEach((invoice) => {
      const total = Number(
        invoice.total_amount ||
          invoice.amount ||
          0
      );

      const paidAmount = Number(
        invoice.paid_amount ||
          invoice.amount_paid ||
          invoice.total_paid ||
          0
      );

      invoiced += total;
      paid += paidAmount;
      outstanding += Math.max(
        total - paidAmount,
        0
      );
    });

    const paidInvoices = invoices.filter(
      (invoice) =>
        getInvoiceStatus(invoice) === "PAID"
    ).length;

    return {
      invoiced,
      paid,
      outstanding,
      count: invoices.length,
      paidInvoices,
    };
  }, [invoices]);


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredInvoices = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return invoices.filter((invoice) => {
      const status =
        getInvoiceStatus(invoice);

      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter;

      const matchesSearch =
        !query ||
        String(
          invoice.invoice_number || ""
        )
          .toLowerCase()
          .includes(query) ||
        String(
          invoice.customer_name || ""
        )
          .toLowerCase()
          .includes(query) ||
        String(
          invoice.sales_order_id || ""
        )
          .toLowerCase()
          .includes(query);

      return (
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    invoices,
    search,
    statusFilter,
  ]);


  /* =======================================================
     CREATE INVOICE
  ======================================================= */

  const handleCreateInvoice = async () => {
    if (!selectedSalesOrderId) {
      setError(
        "Please select a Sales Order."
      );
      return;
    }

    try {
      setCreatingInvoice(true);
      setError("");

      const invoice =
        await createInvoiceFromSalesOrder(
          selectedSalesOrderId
        );

      await loadFinance();

      setShowCreateInvoiceModal(false);
      setSelectedSalesOrderId("");

      if (invoice) {
        setSelectedInvoice(invoice);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to create invoice."
      );
    } finally {
      setCreatingInvoice(false);
    }
  };


  /* =======================================================
     PAYMENT
  ======================================================= */

  const openPaymentModal = (
    invoice = null
  ) => {
    setPaymentRisk(null);

    setPaymentForm({
      invoice_id:
        invoice?.id
          ? String(invoice.id)
          : "",
      amount: invoice
        ? String(
            Number(
              invoice.total_amount ||
                0
            ) -
              Number(
                invoice.paid_amount ||
                  invoice.amount_paid ||
                  0
              )
          )
        : "",
      payment_method:
        "BANK_TRANSFER",
      reference_number: "",
    });

    setShowPaymentModal(true);
  };


  const handlePaymentChange = (
    field,
    value
  ) => {
    setPaymentForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  const handleCreatePayment = async (
    event
  ) => {
    event.preventDefault();

    if (
      !paymentForm.invoice_id ||
      !paymentForm.amount
    ) {
      setError(
        "Invoice and payment amount are required."
      );
      return;
    }

    try {
      setCreatingPayment(true);
      setError("");

      const payload = {
        invoice_id: Number(
          paymentForm.invoice_id
        ),
        amount: Number(
          paymentForm.amount
        ),
        payment_method:
          paymentForm.payment_method,
        reference_number:
          paymentForm.reference_number ||
          undefined,
      };

      const payment =
        await createPayment(payload);

      await loadFinance();

      if (payment?.id) {
        await runPaymentRisk(payment.id);
      }

      setShowPaymentModal(false);

      setPaymentForm({
        invoice_id: "",
        amount: "",
        payment_method:
          "BANK_TRANSFER",
        reference_number: "",
      });
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to create payment."
      );
    } finally {
      setCreatingPayment(false);
    }
  };


  /* =======================================================
     PAYMENT RISK
  ======================================================= */

  const runPaymentRisk = async (
    paymentId
  ) => {
    try {
      setRiskLoading(true);

      const risk =
        await getPaymentRisk(
          paymentId
        );

      setPaymentRisk(risk);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to calculate payment risk."
      );
    } finally {
      setRiskLoading(false);
    }
  };


  /* =======================================================
     OPEN INVOICE
  ======================================================= */

  const openInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };


  /* =======================================================
     CLOSE
  ======================================================= */

  const closeInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoiceModal(false);
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="finance-page">
        <div className="finance-loading">
          <div className="finance-spinner" />
          <h3>
            Loading Finance Workspace...
          </h3>
          <p>
            Connecting to the NEXUS billing
            intelligence layer.
          </p>
        </div>
      </div>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="finance-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="finance-header">

        <div>
          <div className="finance-eyebrow">
            <CircleDollarSign size={15} />
            FINANCE / BILLING
          </div>

          <h1>
            Finance Workspace
          </h1>

          <p>
            Manage invoices, payments,
            receipts and financial risk
            across the NEXUS operation.
          </p>
        </div>


        <div className="finance-header-actions">

          <button
            className="finance-refresh-btn"
            onClick={() =>
              loadFinance(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "finance-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>


          <button
            className="finance-primary-btn"
            onClick={() =>
              setShowCreateInvoiceModal(
                true
              )
            }
          >
            <Plus size={17} />
            Create Invoice
          </button>

        </div>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="finance-error">
          <AlertTriangle size={17} />

          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* =================================================
          KPI
      ================================================= */}

      <div className="finance-kpi-grid">

        <KpiCard
          title="Total Invoiced"
          value={formatCurrency(
            metrics.invoiced
          )}
          description="Total invoice value"
          icon={ReceiptIndianRupee}
        />

        <KpiCard
          title="Total Collected"
          value={formatCurrency(
            metrics.paid
          )}
          description="Payments received"
          icon={Wallet}
        />

        <KpiCard
          title="Outstanding"
          value={formatCurrency(
            metrics.outstanding
          )}
          description="Amount still receivable"
          icon={TrendingUp}
        />

        <KpiCard
          title="Invoices"
          value={metrics.count}
          description={`${metrics.paidInvoices} fully paid`}
          icon={FileText}
        />

      </div>


      {/* =================================================
          FINANCE SUMMARY
      ================================================= */}

      <div className="finance-summary">

        <div className="finance-summary-heading">
          <div>
            <span>
              FINANCIAL OVERVIEW
            </span>

            <h2>
              Receivables Position
            </h2>
          </div>

          <CreditCard size={22} />
        </div>


        <div className="finance-progress-wrapper">

          <div className="finance-progress-label">
            <span>
              Collection Progress
            </span>

            <strong>
              {metrics.invoiced > 0
                ? (
                    (metrics.paid /
                      metrics.invoiced) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </strong>
          </div>

          <div className="finance-progress">
            <div
              style={{
                width: `${
                  metrics.invoiced > 0
                    ? Math.min(
                        (metrics.paid /
                          metrics.invoiced) *
                          100,
                        100
                      )
                    : 0
                }%`,
              }}
            />
          </div>

        </div>

      </div>


      {/* =================================================
          INVOICES
      ================================================= */}

      <div className="finance-table-card">

        <div className="finance-table-header">

          <div>
            <span>
              BILLING MANAGEMENT
            </span>

            <h2>
              Invoices
            </h2>
          </div>


          <div className="finance-controls">

            <div className="finance-search">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search invoices..."
              />
            </div>


            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                All Statuses
              </option>

              <option value="PAID">
                Paid
              </option>

              <option value="PARTIALLY_PAID">
                Partially Paid
              </option>

              <option value="UNPAID">
                Unpaid
              </option>

              <option value="OVERDUE">
                Overdue
              </option>
            </select>

          </div>

        </div>


        {filteredInvoices.length === 0 ? (

          <div className="finance-empty">

            <ReceiptIndianRupee
              size={42}
            />

            <h3>
              No invoices found
            </h3>

            <p>
              Create an invoice from a
              confirmed Sales Order to
              begin billing.
            </p>

          </div>

        ) : (

          <div className="finance-table-wrapper">

            <table className="finance-table">

              <thead>
                <tr>
                  <th>
                    Invoice
                  </th>

                  <th>
                    Sales Order
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Paid
                  </th>

                  <th>
                    Outstanding
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Date
                  </th>

                  <th />
                </tr>
              </thead>


              <tbody>

                {filteredInvoices.map(
                  (invoice) => {

                    const total =
                      Number(
                        invoice.total_amount ||
                          invoice.amount ||
                          0
                      );

                    const paid =
                      Number(
                        invoice.paid_amount ||
                          invoice.amount_paid ||
                          0
                      );

                    const outstanding =
                      Math.max(
                        total - paid,
                        0
                      );

                    const status =
                      getInvoiceStatus(
                        invoice
                      );

                    return (
                      <tr
                        key={invoice.id}
                      >

                        <td>

                          <div className="invoice-name">

                            <div className="invoice-icon">
                              <ReceiptIndianRupee
                                size={17}
                              />
                            </div>

                            <div>
                              <strong>
                                {invoice.invoice_number ||
                                  `INV-${String(
                                    invoice.id
                                  ).padStart(
                                    6,
                                    "0"
                                  )}`}
                              </strong>

                              <small>
                                ID #
                                {invoice.id}
                              </small>
                            </div>

                          </div>

                        </td>


                        <td>
                          SO-
                          {String(
                            invoice.sales_order_id ||
                              0
                          ).padStart(
                            6,
                            "0"
                          )}
                        </td>


                        <td>
                          <strong>
                            {formatCurrency(
                              total,
                              invoice.currency ||
                                "INR"
                            )}
                          </strong>
                        </td>


                        <td>
                          {formatCurrency(
                            paid,
                            invoice.currency ||
                              "INR"
                          )}
                        </td>


                        <td>
                          {formatCurrency(
                            outstanding,
                            invoice.currency ||
                              "INR"
                          )}
                        </td>


                        <td>
                          <StatusBadge
                            status={status}
                          />
                        </td>


                        <td>
                          {formatDate(
                            invoice.created_at
                          )}
                        </td>


                        <td>

                          <div className="finance-row-actions">

                            <button
                              className="finance-view-btn"
                              onClick={() =>
                                openInvoice(
                                  invoice
                                )
                              }
                            >
                              View
                            </button>

                            {outstanding >
                              0 && (
                              <button
                                className="finance-pay-btn"
                                onClick={() =>
                                  openPaymentModal(
                                    invoice
                                  )
                                }
                              >
                                Pay
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* =================================================
          PAYMENT RISK
      ================================================= */}

      {paymentRisk && (

        <div className="finance-risk-card">

          <div className="finance-risk-header">

            <div>
              <span>
                AI FINANCIAL INTELLIGENCE
              </span>

              <h2>
                Latest Payment Risk
              </h2>
            </div>

            <BrainCircuit size={22} />

          </div>


          <div className="finance-risk-grid">

            <div>
              <span>
                Payment ID
              </span>

              <strong>
                #{paymentRisk.payment_id}
              </strong>
            </div>


            <div>
              <span>
                Amount
              </span>

              <strong>
                {formatCurrency(
                  paymentRisk.amount
                )}
              </strong>
            </div>


            <div>
              <span>
                Risk Score
              </span>

              <strong>
                {paymentRisk.risk_score}
                /100
              </strong>
            </div>


            <div>
              <span>
                Risk Level
              </span>

              <strong
                className={`risk-${String(
                  paymentRisk.risk_level ||
                    "UNKNOWN"
                ).toLowerCase()}`}
              >
                {paymentRisk.risk_level}
              </strong>
            </div>

          </div>


          {paymentRisk.reasons?.length >
            0 && (

            <div className="finance-risk-reasons">

              <strong>
                Risk Analysis
              </strong>

              <ul>
                {paymentRisk.reasons.map(
                  (
                    reason,
                    index
                  ) => (
                    <li key={index}>
                      <CheckCircle2
                        size={14}
                      />
                      {reason}
                    </li>
                  )
                )}
              </ul>

            </div>

          )}

        </div>
      )}


      {/* =================================================
          INVOICE MODAL
      ================================================= */}

      {showInvoiceModal &&
        selectedInvoice && (

          <div
            className="finance-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeInvoice();
              }
            }}
          >

            <div className="finance-modal">

              <div className="finance-modal-header">

                <div>
                  <span>
                    INVOICE DETAILS
                  </span>

                  <h2>
                    {selectedInvoice.invoice_number ||
                      `INV-${String(
                        selectedInvoice.id
                      ).padStart(
                        6,
                        "0"
                      )}`}
                  </h2>
                </div>

                <button
                  className="finance-close-btn"
                  onClick={
                    closeInvoice
                  }
                >
                  <X size={18} />
                </button>

              </div>


              <div className="invoice-detail-grid">

                <div>
                  <span>
                    Invoice ID
                  </span>

                  <strong>
                    #{selectedInvoice.id}
                  </strong>
                </div>


                <div>
                  <span>
                    Sales Order
                  </span>

                  <strong>
                    SO-
                    {String(
                      selectedInvoice.sales_order_id ||
                        0
                    ).padStart(
                      6,
                      "0"
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    Invoice Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedInvoice.created_at
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    Status
                  </span>

                  <StatusBadge
                    status={getInvoiceStatus(
                      selectedInvoice
                    )}
                  />
                </div>

              </div>


              <div className="invoice-amount-panel">

                <div>
                  <span>
                    TOTAL AMOUNT
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedInvoice.total_amount ||
                        selectedInvoice.amount ||
                        0,
                      selectedInvoice.currency ||
                        "INR"
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    PAID
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedInvoice.paid_amount ||
                        selectedInvoice.amount_paid ||
                        0,
                      selectedInvoice.currency ||
                        "INR"
                    )}
                  </strong>
                </div>


                <div>
                  <span>
                    OUTSTANDING
                  </span>

                  <strong>
                    {formatCurrency(
                      Math.max(
                        Number(
                          selectedInvoice.total_amount ||
                            0
                        ) -
                          Number(
                            selectedInvoice.paid_amount ||
                              selectedInvoice.amount_paid ||
                              0
                          ),
                        0
                      ),
                      selectedInvoice.currency ||
                        "INR"
                    )}
                  </strong>
                </div>

              </div>


              <div className="finance-modal-actions">

                <button
                  className="finance-modal-primary"
                  onClick={() =>
                    openPaymentModal(
                      selectedInvoice
                    )
                  }
                >
                  <CreditCard
                    size={16}
                  />

                  Record Payment
                </button>

              </div>

            </div>

          </div>
        )}


      {/* =================================================
          CREATE INVOICE MODAL
      ================================================= */}

      {showCreateInvoiceModal && (

        <div
          className="finance-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowCreateInvoiceModal(
                false
              );
            }
          }}
        >

          <div className="finance-modal">

            <div className="finance-modal-header">

              <div>
                <span>
                  BILLING
                </span>

                <h2>
                  Create Invoice
                </h2>
              </div>

              <button
                className="finance-close-btn"
                onClick={() =>
                  setShowCreateInvoiceModal(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="finance-form">

              <label>
                Sales Order

                <select
                  value={
                    selectedSalesOrderId
                  }
                  onChange={(event) =>
                    setSelectedSalesOrderId(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    Select Sales Order
                  </option>

                  {salesOrders
                    .filter(
                      (order) =>
                        String(
                          order.status
                        ).toUpperCase() ===
                          "CONFIRMED" ||
                        String(
                          order.status
                        ).toUpperCase() ===
                          "PROCESSING"
                    )
                    .map((order) => (
                      <option
                        key={order.id}
                        value={order.id}
                      >
                        {order.order_number ||
                          `SO-${String(
                            order.id
                          ).padStart(
                            6,
                            "0"
                          )}`}{" "}
                        —{" "}
                        {formatCurrency(
                          order.total_amount ||
                            0,
                          order.currency ||
                            "INR"
                        )}
                      </option>
                    ))}

                </select>
              </label>


              <div className="finance-form-info">
                <FileText size={17} />

                <span>
                  The invoice amount will be
                  calculated by the backend
                  from the selected Sales Order.
                </span>
              </div>


              <button
                className="finance-modal-primary full-width"
                onClick={
                  handleCreateInvoice
                }
                disabled={
                  creatingInvoice ||
                  !selectedSalesOrderId
                }
              >

                {creatingInvoice ? (
                  <LoaderCircle
                    size={16}
                    className="finance-spin"
                  />
                ) : (
                  <Plus size={16} />
                )}

                {creatingInvoice
                  ? "Creating..."
                  : "Create Invoice"}

              </button>

            </div>

          </div>

        </div>
      )}


      {/* =================================================
          PAYMENT MODAL
      ================================================= */}

      {showPaymentModal && (

        <div
          className="finance-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowPaymentModal(
                false
              );
            }
          }}
        >

          <div className="finance-modal">

            <div className="finance-modal-header">

              <div>
                <span>
                  ACCOUNTS RECEIVABLE
                </span>

                <h2>
                  Record Payment
                </h2>
              </div>

              <button
                className="finance-close-btn"
                onClick={() =>
                  setShowPaymentModal(
                    false
                  )
                }
              >
                <X size={18} />
              </button>

            </div>


            <form
              className="finance-form"
              onSubmit={
                handleCreatePayment
              }
            >

              <label>
                Invoice

                <select
                  value={
                    paymentForm.invoice_id
                  }
                  onChange={(event) =>
                    handlePaymentChange(
                      "invoice_id",
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select Invoice
                  </option>

                  {invoices.map(
                    (invoice) => (
                      <option
                        key={invoice.id}
                        value={invoice.id}
                      >
                        {invoice.invoice_number ||
                          `INV-${String(
                            invoice.id
                          ).padStart(
                            6,
                            "0"
                          )}`}{" "}
                        —{" "}
                        {formatCurrency(
                          invoice.total_amount ||
                            0,
                          invoice.currency ||
                            "INR"
                        )}
                      </option>
                    )
                  )}

                </select>
              </label>


              <label>
                Amount

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={
                    paymentForm.amount
                  }
                  onChange={(event) =>
                    handlePaymentChange(
                      "amount",
                      event.target.value
                    )
                  }
                  placeholder="Enter payment amount"
                  required
                />
              </label>


              <label>
                Payment Method

                <select
                  value={
                    paymentForm.payment_method
                  }
                  onChange={(event) =>
                    handlePaymentChange(
                      "payment_method",
                      event.target.value
                    )
                  }
                >
                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>

                  <option value="UPI">
                    UPI
                  </option>

                  <option value="CARD">
                    Card
                  </option>

                  <option value="CASH">
                    Cash
                  </option>

                  <option value="CHEQUE">
                    Cheque
                  </option>
                </select>
              </label>


              <label>
                Reference Number

                <input
                  type="text"
                  value={
                    paymentForm.reference_number
                  }
                  onChange={(event) =>
                    handlePaymentChange(
                      "reference_number",
                      event.target.value
                    )
                  }
                  placeholder="Transaction / reference ID"
                />
              </label>


              <div className="finance-form-info">
                <BrainCircuit
                  size={17}
                />

                <span>
                  After payment creation,
                  NEXUS will run the AI payment
                  risk analysis automatically.
                </span>
              </div>


              <button
                type="submit"
                className="finance-modal-primary full-width"
                disabled={
                  creatingPayment
                }
              >

                {creatingPayment ? (
                  <LoaderCircle
                    size={16}
                    className="finance-spin"
                  />
                ) : (
                  <CreditCard
                    size={16}
                  />
                )}

                {creatingPayment
                  ? "Processing..."
                  : "Record Payment"}

              </button>

            </form>


            {riskLoading && (
              <div className="finance-risk-loading">
                <LoaderCircle
                  size={17}
                  className="finance-spin"
                />

                Running AI payment risk
                analysis...
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}