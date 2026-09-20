import { useEffect, useMemo, useState } from "react";

import {
  ClipboardList,
  Eye,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Truck,
  X,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";

import {
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  confirmPurchaseOrder,
  listGoodsReceipts,
  createGoodsReceipt,
  receiveGoodsReceipt,
} from "../api/procurement";

import api from "../api/client";


export default function Procurement() {

  const [purchaseOrders, setPurchaseOrders] =
    useState([]);

  const [goodsReceipts, setGoodsReceipts] =
    useState([]);

  const [suppliers, setSuppliers] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [warehouses, setWarehouses] =
    useState([]);

  const [companies, setCompanies] =
    useState([]);


  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [confirming, setConfirming] =
    useState(false);

  const [receiving, setReceiving] =
    useState(false);


  const [error, setError] =
    useState("");


  const [search, setSearch] =
    useState("");


  const [activeTab, setActiveTab] =
    useState("purchase-orders");


  const [showCreatePO, setShowCreatePO] =
    useState(false);


  const [showCreateReceipt, setShowCreateReceipt] =
    useState(false);


  const [selectedPO, setSelectedPO] =
    useState(null);


  const [selectedReceipt, setSelectedReceipt] =
    useState(null);


  /* =======================================================
     FORMS
     ======================================================= */

  const [poForm, setPOForm] = useState({
    company_id: "",
    supplier_id: "",
    currency: "INR",
    product_id: "",
    quantity: 1,
    unit_price: "",
  });


  const [receiptForm, setReceiptForm] =
    useState({
      purchase_order_id: "",
      warehouse_id: "",
      items: [],
    });


  /* =======================================================
     LOAD DATA
     ======================================================= */

  const loadData = async (
    refresh = false
  ) => {

    try {

      setError("");

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }


      const [
        purchaseOrdersData,
        receiptsData,
        suppliersResponse,
        productsResponse,
        warehousesResponse,
        companiesResponse,
      ] = await Promise.all([

        listPurchaseOrders(),

        listGoodsReceipts(),

        api.get("/suppliers"),

        api.get("/products"),

        api.get("/warehouses"),

        api.get("/companies"),

      ]);


      setPurchaseOrders(
        Array.isArray(purchaseOrdersData)
          ? purchaseOrdersData
          : []
      );


      setGoodsReceipts(
        Array.isArray(receiptsData)
          ? receiptsData
          : []
      );


      setSuppliers(
        Array.isArray(
          suppliersResponse.data
        )
          ? suppliersResponse.data
          : []
      );


      setProducts(
        Array.isArray(
          productsResponse.data
        )
          ? productsResponse.data
          : []
      );


      setWarehouses(
        Array.isArray(
          warehousesResponse.data
        )
          ? warehousesResponse.data
          : []
      );


      setCompanies(
        Array.isArray(
          companiesResponse.data
        )
          ? companiesResponse.data
          : []
      );


    } catch (err) {

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load procurement data."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  };


  useEffect(() => {
    loadData();
  }, []);


  /* =======================================================
     LOOKUPS
     ======================================================= */

  const supplierMap = useMemo(
    () =>
      new Map(
        suppliers.map((supplier) => [
          supplier.id,
          supplier,
        ])
      ),
    [suppliers]
  );


  const productMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product,
        ])
      ),
    [products]
  );


  const warehouseMap = useMemo(
    () =>
      new Map(
        warehouses.map((warehouse) => [
          warehouse.id,
          warehouse,
        ])
      ),
    [warehouses]
  );


  const companyMap = useMemo(
    () =>
      new Map(
        companies.map((company) => [
          company.id,
          company,
        ])
      ),
    [companies]
  );


  /* =======================================================
     FILTER
     ======================================================= */

  const filteredPOs =
    purchaseOrders.filter((po) => {

      const supplier =
        supplierMap.get(
          po.supplier_id
        );


      const searchable = [
        po.po_number,
        po.status,
        supplier?.supplier_code,
        String(po.supplier_id),
      ]
        .join(" ")
        .toLowerCase();


      return searchable.includes(
        search.toLowerCase()
      );

    });


  const filteredReceipts =
    goodsReceipts.filter((receipt) => {
      const searchable = [
        receipt.receipt_number,
        receipt.status,
        String(receipt.purchase_order_id),
        String(receipt.warehouse_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        search.toLowerCase()
      );
    });


  /* =======================================================
     SUMMARY
     ======================================================= */

  const totalPOs =
    purchaseOrders.length;


  const draftPOs =
    purchaseOrders.filter(
      (po) =>
        po.status === "DRAFT"
    ).length;


  const confirmedPOs =
    purchaseOrders.filter(
      (po) =>
        po.status === "CONFIRMED"
    ).length;


  const receivedPOs =
    purchaseOrders.filter(
      (po) =>
        po.status === "RECEIVED"
    ).length;


  const totalProcurementValue =
    purchaseOrders.reduce(
      (sum, po) =>
        sum +
        Number(
          po.total_amount || 0
        ),
      0
    );


  const formatCurrency = (
    value,
    currency = "INR"
  ) => {

    try {
      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }
      ).format(
        Number(value || 0)
      );
    } catch {
      return `${currency} ${Number(value || 0).toFixed(2)}`;
    }

  };


  /* =======================================================
     CREATE PURCHASE ORDER
     ======================================================= */

  const handlePOChange = (
    field,
    value
  ) => {

    setPOForm((current) => ({
      ...current,
      [field]: value,
    }));

  };


  const handleCreatePO = async (
    event
  ) => {

    event.preventDefault();

    try {

      setCreating(true);
      setError("");


      if (
        !poForm.company_id ||
        !poForm.supplier_id ||
        !poForm.product_id ||
        !poForm.quantity ||
        !poForm.unit_price
      ) {

        setError(
          "Please complete all purchase order fields."
        );

        return;

      }


      const payload = {

        company_id:
          Number(
            poForm.company_id
          ),

        supplier_id:
          Number(
            poForm.supplier_id
          ),

        currency:
          poForm.currency,

        items: [
          {
            product_id:
              Number(
                poForm.product_id
              ),

            quantity:
              Number(
                poForm.quantity
              ),

            unit_price:
              Number(
                poForm.unit_price
              ),
          },
        ],

      };


      await createPurchaseOrder(
        payload
      );


      setShowCreatePO(false);


      setPOForm({
        company_id: "",
        supplier_id: "",
        currency: "INR",
        product_id: "",
        quantity: 1,
        unit_price: "",
      });


      await loadData(true);


    } catch (err) {

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to create purchase order."
      );

    } finally {

      setCreating(false);

    }

  };


  /* =======================================================
     VIEW PURCHASE ORDER
     ======================================================= */

  const handleViewPO = async (
    id
  ) => {

    try {

      setError("");

      const po =
        await getPurchaseOrder(id);

      setSelectedPO(po);

    } catch (err) {

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load purchase order."
      );

    }

  };


  /* =======================================================
     CONFIRM PURCHASE ORDER
     ======================================================= */

  const handleConfirmPO = async (
    id
  ) => {

    try {

      setConfirming(true);
      setError("");


      const updated =
        await confirmPurchaseOrder(
          id
        );


      setSelectedPO(updated);

      await loadData(true);


    } catch (err) {

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to confirm purchase order."
      );

    } finally {

      setConfirming(false);

    }

  };


  /* =======================================================
     GOODS RECEIPT FORM
     ======================================================= */

  const openReceiptForm = (
    po
  ) => {

    if (po.status !== "CONFIRMED") {
      setError(
        "Goods can only be received against a confirmed purchase order."
      );
      return;
    }

    const items =
      (po.items || []).map(
        (item) => ({
          product_id:
            item.product_id,

          received_quantity:
            item.quantity,
        })
      );


    setReceiptForm({
      purchase_order_id:
        po.id,

      warehouse_id:
        warehouses[0]?.id
          ? String(
              warehouses[0].id
            )
          : "",

      items,
    });


    setSelectedPO(null);

    setShowCreateReceipt(true);

  };


  const handleReceiptQuantity = (
    productId,
    value
  ) => {

    setReceiptForm(
      (current) => ({

        ...current,

        items:
          current.items.map(
            (item) =>
              item.product_id ===
              productId
                ? {
                    ...item,
                    received_quantity:
                      Number(value),
                  }
                : item
          ),

      })
    );

  };


  const handleCreateReceipt = async (
    event
  ) => {

    event.preventDefault();


    try {

      setCreating(true);
      setError("");


      if (
        !receiptForm.purchase_order_id ||
        !receiptForm.warehouse_id
      ) {

        setError(
          "Please select a purchase order and warehouse."
        );

        return;

      }


      const validItems =
        receiptForm.items.filter(
          (item) =>
            Number(
              item.received_quantity
            ) > 0
        );


      if (!validItems.length) {

        setError(
          "At least one received quantity is required."
        );

        return;

      }


      const payload = {

        purchase_order_id:
          Number(
            receiptForm.purchase_order_id
          ),

        warehouse_id:
          Number(
            receiptForm.warehouse_id
          ),

        items:
          validItems.map(
            (item) => ({
              product_id:
                Number(
                  item.product_id
                ),

              received_quantity:
                Number(
                  item.received_quantity
                ),
            })
          ),

      };


      const receipt =
        await createGoodsReceipt(
          payload
        );


      setShowCreateReceipt(false);

      setSelectedReceipt(receipt);


      setReceiptForm({
        purchase_order_id: "",
        warehouse_id: "",
        items: [],
      });


      await loadData(true);


    } catch (err) {

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to create goods receipt."
      );

    } finally {

      setCreating(false);

    }

  };


  /* =======================================================
     RECEIVE GOODS
     ======================================================= */

  const handleReceive = async (
    id
  ) => {

    try {

      setReceiving(true);
      setError("");


      const updated =
        await receiveGoodsReceipt(
          id
        );


      setSelectedReceipt(
        updated
      );


      await loadData(true);


    } catch (err) {

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to receive goods."
      );

    } finally {

      setReceiving(false);

    }

  };


  /* =======================================================
     RENDER
     ======================================================= */

  return (

    <section className="module-page">


      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="module-header">

        <div>

          <div className="module-eyebrow">
            OPERATIONS / PROCUREMENT
          </div>

          <h1>
            Procurement
          </h1>

          <p>
            Manage purchase orders, suppliers,
            incoming goods, and warehouse receiving.
          </p>

        </div>


        <div className="module-header-actions">

          <button
            className="secondary-button"
            onClick={() =>
              loadData(true)
            }
            disabled={refreshing}
          >

            {refreshing ? (
              <Loader2
                size={17}
                className="spin"
              />
            ) : (
              <RefreshCw size={17} />
            )}

            Refresh

          </button>


          <button
            className="primary-button"
            onClick={() =>
              setShowCreatePO(true)
            }
          >

            <Plus size={17} />

            New Purchase Order

          </button>

        </div>

      </div>


      {/* ===================================================
          ERROR
          =================================================== */}

      {error && (

        <div className="module-error">

          <span>
            {error}
          </span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <X size={16} />
          </button>

        </div>

      )}


      {/* ===================================================
          SUMMARY
          =================================================== */}

      <div className="module-summary">

        <div className="summary-card">

          <span>
            Purchase Orders
          </span>

          <strong>
            {totalPOs}
          </strong>

          <small>
            Total procurement orders
          </small>

        </div>


        <div className="summary-card">

          <span>
            Draft
          </span>

          <strong>
            {draftPOs}
          </strong>

          <small>
            Awaiting confirmation
          </small>

        </div>


        <div className="summary-card">

          <span>
            Confirmed
          </span>

          <strong>
            {confirmedPOs}
          </strong>

          <small>
            Ready for receiving
          </small>

        </div>


        <div className="summary-card">

          <span>
            Received
          </span>

          <strong>
            {receivedPOs}
          </strong>

          <small>
            Completed purchase orders
          </small>

        </div>


        <div className="summary-card">

          <span>
            Procurement Value
          </span>

          <strong>
            {formatCurrency(
              totalProcurementValue
            )}
          </strong>

          <small>
            Total purchase order value
          </small>

        </div>

      </div>


      {/* ===================================================
          TABS
          =================================================== */}

      <div className="workspace-tabs">

        <button
          className={
            activeTab ===
            "purchase-orders"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "purchase-orders"
            )
          }
        >

          <ClipboardList
            size={17}
          />

          Purchase Orders

        </button>


        <button
          className={
            activeTab ===
            "goods-receipts"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "goods-receipts"
            )
          }
        >

          <PackageCheck
            size={17}
          />

          Goods Receipts

        </button>

      </div>


      {/* ===================================================
          SEARCH
          =================================================== */}

      <div className="module-toolbar">

        <div className="module-search">

          <Search size={17} />

          <input
            type="text"
            placeholder={
              activeTab ===
              "purchase-orders"
                ? "Search purchase orders..."
                : "Search receipts..."
            }
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

        </div>

      </div>


      {/* ===================================================
          PURCHASE ORDERS
          =================================================== */}

      {activeTab ===
        "purchase-orders" && (

        <div className="data-card">

          {loading ? (

            <div className="module-loading">

              <Loader2
                size={30}
                className="spin"
              />

              <p>
                Loading purchase orders...
              </p>

            </div>

          ) : filteredPOs.length === 0 ? (

            <div className="empty-state">

              <ShoppingCart
                size={40}
              />

              <h3>
                No purchase orders found
              </h3>

              <p>
                Create a purchase order
                to begin procurement.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table className="nexus-table">

                <thead>

                  <tr>

                    <th>
                      PO Number
                    </th>

                    <th>
                      Supplier
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Items
                    </th>

                    <th>
                      Currency
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredPOs.map(
                    (po) => {

                      const supplier =
                        supplierMap.get(
                          po.supplier_id
                        );


                      return (

                        <tr
                          key={po.id}
                        >

                          <td>

                            <strong>
                              {po.po_number}
                            </strong>

                          </td>


                          <td>

                            {supplier?.supplier_code ||
                              `Supplier #${po.supplier_id}`}

                          </td>


                          <td>

                            <span
                              className={`status-badge procurement-${String(
                                po.status
                              ).toLowerCase()}`}
                            >
                              {po.status}
                            </span>

                          </td>


                          <td>
                            {po.items?.length ||
                              0}
                          </td>


                          <td>
                            {po.currency}
                          </td>


                          <td>

                            <strong>
                              {formatCurrency(
                                po.total_amount
                              )}
                            </strong>

                          </td>


                          <td>

                            <button
                              className="table-action"
                              onClick={() =>
                                handleViewPO(
                                  po.id
                                )
                              }
                            >

                              <Eye
                                size={16}
                              />

                              View

                            </button>

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

      )}


      {/* ===================================================
          GOODS RECEIPTS
          =================================================== */}

      {activeTab ===
        "goods-receipts" && (

        <div className="data-card">

          {loading ? (

            <div className="module-loading">

              <Loader2
                size={30}
                className="spin"
              />

              <p>
                Loading goods receipts...
              </p>

            </div>

          ) : goodsReceipts.length === 0 ? (

            <div className="empty-state">

              <PackageCheck
                size={40}
              />

              <h3>
                No goods receipts found
              </h3>

              <p>
                Confirm a purchase order
                and create a receipt when
                goods arrive.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table className="nexus-table">

                <thead>

                  <tr>

                    <th>
                      Receipt
                    </th>

                    <th>
                      Purchase Order
                    </th>

                    <th>
                      Warehouse
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Items
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredReceipts.map(
                    (receipt) => {

                        const warehouse =
                          warehouseMap.get(
                            receipt.warehouse_id
                          );


                        return (

                          <tr
                            key={receipt.id}
                          >

                            <td>

                              <strong>
                                {
                                  receipt.receipt_number ||
                                  `GR-${String(
                                    receipt.id
                                  ).padStart(6, "0")}`
                                }
                              </strong>

                            </td>


                            <td>
                              PO #
                              {
                                receipt.purchase_order_id
                              }
                            </td>


                            <td>
                              {warehouse?.name ||
                                `Warehouse #${receipt.warehouse_id}`}
                            </td>


                            <td>

                              <span
                                className={`status-badge receipt-${String(
                                  receipt.status
                                ).toLowerCase()}`}
                              >
                                {receipt.status}
                              </span>

                            </td>


                            <td>
                              {receipt.items?.length ||
                                0}
                            </td>


                            <td>

                              <button
                                className="table-action"
                                onClick={() =>
                                  setSelectedReceipt(
                                    receipt
                                  )
                                }
                              >

                                <Eye
                                  size={16}
                                />

                                View

                              </button>

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

      )}


      {/* ===================================================
          PURCHASE ORDER MODAL
          =================================================== */}

      {selectedPO && (

        <div className="modal-backdrop">

          <div className="modal-card procurement-modal">

            <div className="modal-header">

              <div>

                <span className="module-eyebrow">
                  PURCHASE ORDER
                </span>

                <h2>
                  {selectedPO.po_number}
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setSelectedPO(null)
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="order-detail-grid">

              <div>

                <span>
                  Supplier
                </span>

                <strong>
                  {
                    supplierMap.get(
                      selectedPO.supplier_id
                    )?.supplier_code ||
                      `Supplier #${selectedPO.supplier_id}`
                  }
                </strong>

              </div>


              <div>

                <span>
                  Company
                </span>

                <strong>
                  {
                    companyMap.get(
                      selectedPO.company_id
                    )?.name ||
                      `Company #${selectedPO.company_id}`
                  }
                </strong>

              </div>


              <div>

                <span>
                  Status
                </span>

                <strong>
                  <span
                    className={`status-badge procurement-${String(
                      selectedPO.status
                    ).toLowerCase()}`}
                  >
                    {selectedPO.status}
                  </span>
                </strong>

              </div>


              <div>

                <span>
                  Total
                </span>

                <strong>
                  {formatCurrency(
                    selectedPO.total_amount
                  )}
                </strong>

              </div>

            </div>


            <h3>
              Purchase Order Items
            </h3>


            <div className="procurement-items">

              {selectedPO.items?.map(
                (item) => {

                  const product =
                    productMap.get(
                      item.product_id
                    );


                  return (

                    <div
                      className="procurement-item"
                      key={item.id}
                    >

                      <div>

                        <strong>
                          {product?.name ||
                            `Product #${item.product_id}`}
                        </strong>

                        <span>
                          SKU:{" "}
                          {product?.sku ||
                            "—"}
                        </span>

                      </div>


                      <div>

                        <span>
                          Qty:{" "}
                          {item.quantity}
                        </span>

                        <strong>
                          {formatCurrency(
                            item.line_total
                          )}
                        </strong>

                      </div>

                    </div>

                  );

                }
              )}

            </div>


            <div className="modal-actions">

              {selectedPO.status ===
                "DRAFT" && (

                <button
                  className="primary-button"
                  onClick={() =>
                    handleConfirmPO(
                      selectedPO.id
                    )
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
                      <CheckCircle2
                        size={17}
                      />

                      Confirm Purchase Order

                    </>

                  )}

                </button>

              )}


              {selectedPO.status ===
                "CONFIRMED" && (

                <button
                  className="primary-button"
                  onClick={() =>
                    openReceiptForm(
                      selectedPO
                    )
                  }
                >

                  <PackageCheck
                    size={17}
                  />

                  Create Goods Receipt

                </button>

              )}

            </div>

          </div>

        </div>

      )}


      {/* ===================================================
          CREATE PURCHASE ORDER
          =================================================== */}

      {showCreatePO && (

        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="modal-header">

              <div>

                <span className="module-eyebrow">
                  PROCUREMENT
                </span>

                <h2>
                  New Purchase Order
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setShowCreatePO(false)
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleCreatePO
              }
            >


              <div className="form-group">

                <label>
                  Company
                </label>

                <select
                  value={
                    poForm.company_id
                  }
                  onChange={(event) =>
                    handlePOChange(
                      "company_id",
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select company
                  </option>

                  {companies.map(
                    (company) => (

                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name ||
                          company.company_name ||
                          `Company #${company.id}`}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Supplier
                </label>

                <select
                  value={
                    poForm.supplier_id
                  }
                  onChange={(event) =>
                    handlePOChange(
                      "supplier_id",
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select supplier
                  </option>

                  {suppliers.map(
                    (supplier) => (

                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.supplier_code}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Product
                </label>

                <select
                  value={
                    poForm.product_id
                  }
                  onChange={(event) =>
                    handlePOChange(
                      "product_id",
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select product
                  </option>

                  {products.map(
                    (product) => (

                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name}
                        {product.sku
                          ? ` — ${product.sku}`
                          : ""}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      poForm.quantity
                    }
                    onChange={(event) =>
                      handlePOChange(
                        "quantity",
                        event.target.value
                      )
                    }
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Unit Price
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 120000"
                    value={
                      poForm.unit_price
                    }
                    onChange={(event) =>
                      handlePOChange(
                        "unit_price",
                        event.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>


              <div className="form-group">

                <label>
                  Currency
                </label>

                <select
                  value={
                    poForm.currency
                  }
                  onChange={(event) =>
                    handlePOChange(
                      "currency",
                      event.target.value
                    )
                  }
                >

                  <option value="INR">
                    INR
                  </option>

                  <option value="USD">
                    USD
                  </option>

                  <option value="EUR">
                    EUR
                  </option>

                </select>

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowCreatePO(false)
                  }
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
                      <Plus
                        size={17}
                      />

                      Create Purchase Order

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ===================================================
          CREATE GOODS RECEIPT
          =================================================== */}

      {showCreateReceipt && (

        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="modal-header">

              <div>

                <span className="module-eyebrow">
                  WAREHOUSE
                </span>

                <h2>
                  Create Goods Receipt
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setShowCreateReceipt(
                    false
                  )
                }
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleCreateReceipt
              }
            >

              <div className="form-group">

                <label>
                  Purchase Order
                </label>

                <select
                  value={
                    receiptForm.purchase_order_id
                  }
                  disabled
                >

                  <option>
                    PO #
                    {
                      receiptForm.purchase_order_id
                    }
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Receiving Warehouse
                </label>

                <select
                  value={
                    receiptForm.warehouse_id
                  }
                  onChange={(event) =>
                    setReceiptForm(
                      (current) => ({
                        ...current,
                        warehouse_id:
                          event.target.value,
                      })
                    )
                  }
                  required
                >

                  <option value="">
                    Select warehouse
                  </option>

                  {warehouses.map(
                    (warehouse) => (

                      <option
                        key={
                          warehouse.id
                        }
                        value={
                          warehouse.id
                        }
                      >
                        {warehouse.name}
                        {" "}
                        (
                        {warehouse.code}
                        )
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="procurement-receipt-items">

                <h3>
                  Received Quantities
                </h3>


                {receiptForm.items.map(
                  (item) => {

                    const product =
                      productMap.get(
                        item.product_id
                      );


                    return (

                      <div
                        className="receipt-item-row"
                        key={
                          item.product_id
                        }
                      >

                        <div>

                          <strong>
                            {product?.name ||
                              `Product #${item.product_id}`}
                          </strong>

                          <span>
                            Ordered quantity:
                            {" "}
                            {
                              purchaseOrders.find(
                                (po) =>
                                  po.id ===
                                  Number(
                                    receiptForm.purchase_order_id
                                  )
                              )?.items?.find(
                                (poItem) =>
                                  poItem.product_id ===
                                  item.product_id
                              )?.quantity ??
                                "—"}
                          </span>

                        </div>


                        <input
                          type="number"
                          min="1"
                          value={
                            item.received_quantity
                          }
                          onChange={(event) =>
                            handleReceiptQuantity(
                              item.product_id,
                              event.target.value
                            )
                          }
                          required
                        />

                      </div>

                    );

                  }
                )}

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowCreateReceipt(
                      false
                    )
                  }
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
                      <PackageCheck
                        size={17}
                      />

                      Create Receipt

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ===================================================
          RECEIPT DETAILS
          =================================================== */}

      {selectedReceipt && (

        <div className="modal-backdrop">

          <div className="modal-card">

            <div className="modal-header">

              <div>

                <span className="module-eyebrow">
                  GOODS RECEIPT
                </span>

                <h2>
                  {
                    selectedReceipt.receipt_number
                  }
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setSelectedReceipt(
                    null
                  )
                }
              >
                <X size={20} />
              </button>

            </div>


            <div className="order-detail-grid">

              <div>

                <span>
                  Purchase Order
                </span>

                <strong>
                  PO #
                  {
                    selectedReceipt.purchase_order_id
                  }
                </strong>

              </div>


              <div>

                <span>
                  Warehouse
                </span>

                <strong>
                  {
                    warehouseMap.get(
                      selectedReceipt.warehouse_id
                    )?.name ||
                      `Warehouse #${selectedReceipt.warehouse_id}`
                  }
                </strong>

              </div>


              <div>

                <span>
                  Status
                </span>

                <strong>
                  {selectedReceipt.status}
                </strong>

              </div>


              <div>

                <span>
                  Items
                </span>

                <strong>
                  {
                    selectedReceipt.items
                      ?.length || 0
                  }
                </strong>

              </div>

            </div>


            <div className="procurement-items">

              {selectedReceipt.items?.map(
                (item) => {

                  const product =
                    productMap.get(
                      item.product_id
                    );


                  return (

                    <div
                      className="procurement-item"
                      key={item.id}
                    >

                      <div>

                        <strong>
                          {product?.name ||
                            `Product #${item.product_id}`}
                        </strong>

                        <span>
                          Product #
                          {
                            item.product_id
                          }
                        </span>

                      </div>


                      <strong>
                        Received:
                        {" "}
                        {
                          item.received_quantity
                        }
                      </strong>

                    </div>

                  );

                }
              )}

            </div>


            {selectedReceipt.status !==
              "RECEIVED" && (

              <div className="modal-actions">

                <button
                  className="primary-button"
                  onClick={() =>
                    handleReceive(
                      selectedReceipt.id
                    )
                  }
                  disabled={receiving}
                >

                  {receiving ? (

                    <>
                      <Loader2
                        size={17}
                        className="spin"
                      />

                      Receiving...

                    </>

                  ) : (

                    <>
                      <Truck
                        size={17}
                      />

                      Receive Goods

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