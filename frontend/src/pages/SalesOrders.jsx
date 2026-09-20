import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
  CheckCircle2,
  Eye,
  Loader2,
} from "lucide-react";

import {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  confirmSalesOrder,
} from "../api/sales";

import api from "../api/client";

export default function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [form, setForm] = useState({
    customer_id: "",
    currency: "INR",
    product_id: "",
    quantity: 1,
  });

  const loadData = async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [ordersData, customersResponse, productsResponse] =
        await Promise.all([
          listSalesOrders(),
          api.get("/customers"),
          api.get("/products"),
        ]);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCustomers(
        Array.isArray(customersResponse.data)
          ? customersResponse.data
          : []
      );
      setProducts(
        Array.isArray(productsResponse.data)
          ? productsResponse.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load sales orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !search ||
      String(order.order_number || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(order.customer_id || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!form.customer_id || !form.product_id) {
      setError("Please select a customer and product.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const payload = {
        customer_id: Number(form.customer_id),
        currency: form.currency,
        items: [
          {
            product_id: Number(form.product_id),
            quantity: Number(form.quantity),
          },
        ],
      };

      await createSalesOrder(payload);

      setShowCreate(false);

      setForm({
        customer_id: "",
        currency: "INR",
        product_id: "",
        quantity: 1,
      });

      await loadData(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to create sales order."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleView = async (id) => {
    try {
      setError("");
      const order = await getSalesOrder(id);
      setSelectedOrder(order);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load order details."
      );
    }
  };

  const handleConfirm = async (id) => {
    try {
      setConfirming(true);
      setError("");

      await confirmSalesOrder(id);

      const updatedOrder = await getSalesOrder(id);

      setSelectedOrder(updatedOrder);

      await loadData(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to confirm sales order."
      );
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "status-confirmed";

      case "PROCESSING":
        return "status-processing";

      case "SHIPPED":
        return "status-shipped";

      case "DELIVERED":
        return "status-delivered";

      case "CANCELLED":
        return "status-cancelled";

      default:
        return "status-draft";
    }
  };

  return (
    <section className="module-page">

      {/* Header */}
      <div className="module-header">

        <div>
          <div className="module-eyebrow">
            OPERATIONS / SALES
          </div>

          <h1>Sales Orders</h1>

          <p>
            Manage customer orders, order confirmation,
            and commercial activity.
          </p>
        </div>

        <div className="module-header-actions">

          <button
            className="secondary-button"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <RefreshCw size={17} />
            )}

            Refresh
          </button>

          <button
            className="primary-button"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={17} />
            New Sales Order
          </button>

        </div>

      </div>


      {/* Error */}
      {error && (
        <div className="module-error">
          {error}

          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}


      {/* Summary */}
      <div className="module-summary">

        <div className="summary-card">
          <span>Total Orders</span>
          <strong>{orders.length}</strong>
        </div>

        <div className="summary-card">
          <span>Draft</span>
          <strong>
            {orders.filter((o) => o.status === "DRAFT").length}
          </strong>
        </div>

        <div className="summary-card">
          <span>Confirmed</span>
          <strong>
            {
              orders.filter(
                (o) => o.status === "CONFIRMED"
              ).length
            }
          </strong>
        </div>

        <div className="summary-card">
          <span>Total Value</span>
          <strong>
            {formatCurrency(
              orders.reduce(
                (sum, order) =>
                  sum + Number(order.total_amount || 0),
                0
              )
            )}
          </strong>
        </div>

      </div>


      {/* Controls */}
      <div className="module-toolbar">

        <div className="module-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search order number..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>


        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

      </div>


      {/* Table */}
      <div className="data-card">

        {loading ? (
          <div className="module-loading">
            <Loader2 size={30} className="spin" />
            <p>Loading sales orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={36} />
            <h3>No sales orders found</h3>
            <p>
              Create your first sales order to begin
              tracking commercial activity.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="nexus-table">

              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Currency</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredOrders.map((order) => (
                  <tr key={order.id}>

                    <td>
                      <strong>
                        {order.order_number ||
                          `SO-${order.id}`}
                      </strong>
                    </td>

                    <td>
                      Customer #{order.customer_id}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td>
                      {order.currency || "INR"}
                    </td>

                    <td>
                      {order.items?.length || 0}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          order.total_amount
                        )}
                      </strong>
                    </td>

                    <td>

                      <button
                        className="table-action"
                        onClick={() =>
                          handleView(order.id)
                        }
                      >
                        <Eye size={16} />
                        View
                      </button>

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>


      {/* Create Modal */}
      {showCreate && (
        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <span className="module-eyebrow">
                  SALES
                </span>

                <h2>Create Sales Order</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowCreate(false)}
              >
                <X size={20} />
              </button>

            </div>


            <form onSubmit={handleCreate}>

              <div className="form-group">

                <label>Customer</label>

                <select
                  value={form.customer_id}
                  onChange={(event) =>
                    handleFormChange(
                      "customer_id",
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name ||
                        customer.customer_code ||
                        `Customer #${customer.id}`}
                    </option>
                  ))}

                </select>

              </div>


              <div className="form-group">

                <label>Product</label>

                <select
                  value={form.product_id}
                  onChange={(event) =>
                    handleFormChange(
                      "product_id",
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name ||
                        product.sku ||
                        `Product #${product.id}`}
                  </option>
                  ))}

                </select>

              </div>


              <div className="form-grid">

                <div className="form-group">

                  <label>Quantity</label>

                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) =>
                      handleFormChange(
                        "quantity",
                        event.target.value
                      )
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label>Currency</label>

                  <select
                    value={form.currency}
                    onChange={(event) =>
                      handleFormChange(
                        "currency",
                        event.target.value
                      )
                    }
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>

                </div>

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={17}
                        className="spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Order
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* Details Modal */}
      {selectedOrder && (
        <div className="modal-backdrop">

          <div className="modal-card order-detail-modal">

            <div className="modal-header">

              <div>
                <span className="module-eyebrow">
                  SALES ORDER
                </span>

                <h2>
                  {selectedOrder.order_number ||
                    `SO-${selectedOrder.id}`}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="order-detail-grid">

              <div>
                <span>Status</span>

                <strong>
                  <span
                    className={`status-badge ${getStatusClass(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </strong>
              </div>

              <div>
                <span>Customer</span>
                <strong>
                  #{selectedOrder.customer_id}
                </strong>
              </div>

              <div>
                <span>Currency</span>
                <strong>
                  {selectedOrder.currency || "INR"}
                </strong>
              </div>

              <div>
                <span>Total Amount</span>
                <strong>
                  {formatCurrency(
                    selectedOrder.total_amount
                  )}
                </strong>
              </div>

            </div>


            <div className="order-items">

              <h3>Order Items</h3>

              {selectedOrder.items?.map((item) => (
                <div
                  className="order-item"
                  key={item.id}
                >
                  <div>
                    <strong>
                      Product #{item.product_id}
                    </strong>

                    <span>
                      Quantity: {item.quantity}
                    </span>
                  </div>

                  <strong>
                    {formatCurrency(item.line_total)}
                  </strong>
                </div>
              ))}

            </div>


            {selectedOrder.status === "DRAFT" && (
              <div className="modal-actions">

                <button
                  className="primary-button"
                  onClick={() =>
                    handleConfirm(selectedOrder.id)
                  }
                  disabled={confirming}
                >
                  {confirming ? (
                    <>
                      <Loader2
                        size={17}
                        className="spin"
                      />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Confirm Order
                    </>
                  )}
                </button>

              </div>
            )}

          </div>

        </div>
      )}

    </section>
  );
}