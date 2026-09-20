import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  Warehouse,
  X,
  Loader2,
} from "lucide-react";

import {
  listInventory,
  getInventoryIntelligence,
  getDemandForecast,
} from "../api/inventory";

import api from "../api/client";


export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [intelligence, setIntelligence] = useState({});
  const [forecasts, setForecasts] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);


  /* =========================================================
     LOAD INVENTORY
     ========================================================= */

  const loadInventory = async (refresh = false) => {
    try {
      setError("");

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        inventoryData,
        productsResponse,
        warehousesResponse,
      ] = await Promise.all([
        listInventory(),
        api.get("/products"),
        api.get("/warehouses"),
      ]);

      setInventory(
        Array.isArray(inventoryData)
          ? inventoryData
          : []
      );

      setProducts(
        Array.isArray(productsResponse.data)
          ? productsResponse.data
          : []
      );

      setWarehouses(
        Array.isArray(warehousesResponse.data)
          ? warehousesResponse.data
          : []
      );

    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load inventory."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadInventory();
  }, []);


  /* =========================================================
     LOOKUPS
     ========================================================= */

  const productMap = useMemo(() => {
    return new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );
  }, [products]);


  const warehouseMap = useMemo(() => {
    return new Map(
      warehouses.map((warehouse) => [
        warehouse.id,
        warehouse,
      ])
    );
  }, [warehouses]);


  const getProduct = (productId) =>
    productMap.get(productId);


  const getWarehouse = (warehouseId) =>
    warehouseMap.get(warehouseId);


  /* =========================================================
     FILTER
     ========================================================= */

  const filteredInventory = inventory.filter((item) => {
    const product = getProduct(item.product_id);

    const text = [
      product?.name,
      product?.sku,
      String(item.product_id),
      String(item.warehouse_id),
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });


  /* =========================================================
     SUMMARY
     ========================================================= */

  const totalStock = inventory.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const totalReserved = inventory.reduce(
    (sum, item) =>
      sum + Number(item.reserved_quantity || 0),
    0
  );

  const totalAvailable = inventory.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        Number(item.quantity || 0) -
          Number(item.reserved_quantity || 0)
      ),
    0
  );

  const lowStockCount = inventory.filter(
    (item) =>
      Number(item.quantity || 0) <=
      Number(item.reorder_level || 0)
  ).length;


  /* =========================================================
     AI INTELLIGENCE
     ========================================================= */

  const loadAI = async () => {
    if (!inventory.length) {
      return;
    }

    try {
      setAiLoading(true);

      const limitedInventory =
        inventory.slice(0, 8);

      const results = await Promise.all(
        limitedInventory.map(async (item) => {
          try {
            const [
              intelligenceResult,
              forecastResult,
            ] = await Promise.all([
              getInventoryIntelligence(
                item.product_id
              ),
              getDemandForecast(
                item.product_id
              ),
            ]);

            return {
              productId: item.product_id,
              intelligence: intelligenceResult,
              forecast: forecastResult,
            };

          } catch {
            return {
              productId: item.product_id,
              intelligence: null,
              forecast: null,
            };
          }
        })
      );

      const intelligenceMap = {};
      const forecastMap = {};

      results.forEach((result) => {
        if (result.intelligence) {
          intelligenceMap[result.productId] =
            result.intelligence;
        }

        if (result.forecast) {
          forecastMap[result.productId] =
            result.forecast;
        }
      });

      setIntelligence(intelligenceMap);
      setForecasts(forecastMap);

    } finally {
      setAiLoading(false);
    }
  };


  useEffect(() => {
    if (inventory.length) {
      loadAI();
    }
  }, [inventory]);


  /* =========================================================
     HELPERS
     ========================================================= */

  const getStockStatus = (item) => {
    const quantity = Number(
      item.quantity || 0
    );

    const reorderLevel = Number(
      item.reorder_level || 0
    );

    if (quantity <= reorderLevel) {
      return "LOW";
    }

    if (
      quantity <=
      reorderLevel * 2
    ) {
      return "WATCH";
    }

    return "HEALTHY";
  };


  const getStatusClass = (status) => {
    if (status === "LOW") {
      return "inventory-status-low";
    }

    if (status === "WATCH") {
      return "inventory-status-watch";
    }

    return "inventory-status-healthy";
  };


  const getRiskClass = (risk) => {
    if (risk === "HIGH") {
      return "risk-high";
    }

    if (risk === "MEDIUM") {
      return "risk-medium";
    }

    return "risk-low";
  };


  /* =========================================================
     DETAILS
     ========================================================= */

  const openDetails = (item) => {
    setSelectedItem(item);
  };


  return (
    <section className="module-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="module-header">

        <div>

          <div className="module-eyebrow">
            OPERATIONS / INVENTORY
          </div>

          <h1>
            Inventory
          </h1>

          <p>
            Monitor stock levels, reservations,
            availability, and AI-powered inventory risk.
          </p>

        </div>


        <div className="module-header-actions">

          <button
            className="secondary-button"
            onClick={() =>
              loadInventory(true)
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

        </div>

      </div>


      {/* =====================================================
          ERROR
          ===================================================== */}

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


      {/* =====================================================
          SUMMARY
          ===================================================== */}

      <div className="module-summary">

        <div className="summary-card">

          <span>
            Total Stock
          </span>

          <strong>
            {totalStock.toLocaleString("en-IN")}
          </strong>

          <small>
            Physical inventory units
          </small>

        </div>


        <div className="summary-card">

          <span>
            Reserved
          </span>

          <strong>
            {totalReserved.toLocaleString("en-IN")}
          </strong>

          <small>
            Allocated to orders
          </small>

        </div>


        <div className="summary-card">

          <span>
            Available
          </span>

          <strong>
            {totalAvailable.toLocaleString("en-IN")}
          </strong>

          <small>
            Available for allocation
          </small>

        </div>


        <div className="summary-card">

          <span>
            Low Stock
          </span>

          <strong>
            {lowStockCount}
          </strong>

          <small>
            Reorder threshold reached
          </small>

        </div>

      </div>


      {/* =====================================================
          AI STATUS
          ===================================================== */}

      <div className="ai-banner">

        <div className="ai-banner-icon">
          <Brain size={20} />
        </div>

        <div>

          <strong>
            NEXUS Inventory Intelligence
          </strong>

          <p>
            {aiLoading
              ? "Analyzing inventory demand and risk..."
              : "AI demand forecasting and inventory risk analysis are active."}
          </p>

        </div>

        {aiLoading && (
          <Loader2
            size={18}
            className="spin"
          />
        )}

      </div>


      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <div className="module-toolbar">

        <div className="module-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Search products or SKU..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

      </div>


      {/* =====================================================
          INVENTORY TABLE
          ===================================================== */}

      <div className="data-card">

        {loading ? (

          <div className="module-loading">

            <Loader2
              size={30}
              className="spin"
            />

            <p>
              Loading inventory...
            </p>

          </div>

        ) : filteredInventory.length === 0 ? (

          <div className="empty-state">

            <Package size={40} />

            <h3>
              No inventory found
            </h3>

            <p>
              No inventory records match your search.
            </p>

          </div>

        ) : (

          <div className="table-wrapper">

            <table className="nexus-table">

              <thead>

                <tr>

                  <th>
                    Product
                  </th>

                  <th>
                    Warehouse
                  </th>

                  <th>
                    Stock
                  </th>

                  <th>
                    Reserved
                  </th>

                  <th>
                    Available
                  </th>

                  <th>
                    Reorder Level
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    AI Risk
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredInventory.map(
                  (item) => {

                    const product =
                      getProduct(
                        item.product_id
                      );

                    const warehouse =
                      getWarehouse(
                        item.warehouse_id
                      );

                    const quantity =
                      Number(
                        item.quantity || 0
                      );

                    const reserved =
                      Number(
                        item.reserved_quantity || 0
                      );

                    const available =
                      Math.max(
                        0,
                        quantity -
                          reserved
                      );

                    const stockStatus =
                      getStockStatus(
                        item
                      );

                    const ai =
                      intelligence[
                        item.product_id
                      ];

                    return (

                      <tr
                        key={item.id}
                      >

                        <td>

                          <div className="inventory-product">

                            <div className="inventory-product-icon">
                              <Package
                                size={17}
                              />
                            </div>

                            <div>

                              <strong>
                                {product?.name ||
                                  `Product #${item.product_id}`}
                              </strong>

                              <span>
                                {product?.sku ||
                                  `ID ${item.product_id}`}
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>

                          <div className="warehouse-cell">

                            <Warehouse
                              size={15}
                            />

                            <span>
                              {warehouse?.name ||
                                `Warehouse #${item.warehouse_id}`}
                            </span>

                          </div>

                        </td>


                        <td>
                          <strong>
                            {quantity.toLocaleString(
                              "en-IN"
                            )}
                          </strong>
                        </td>


                        <td>
                          {reserved.toLocaleString(
                            "en-IN"
                          )}
                        </td>


                        <td>

                          <strong>
                            {available.toLocaleString(
                              "en-IN"
                            )}
                          </strong>

                        </td>


                        <td>
                          {Number(
                            item.reorder_level ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </td>


                        <td>

                          <span
                            className={`inventory-status ${getStatusClass(
                              stockStatus
                            )}`}
                          >
                            {stockStatus}
                          </span>

                        </td>


                        <td>

                          {ai ? (

                            <span
                              className={`risk-badge ${getRiskClass(
                                ai.risk_level
                              )}`}
                            >
                              {ai.risk_level}
                            </span>

                          ) : (

                            <span className="muted-text">
                              Analyzing
                            </span>

                          )}

                        </td>


                        <td>

                          <button
                            className="table-action"
                            onClick={() =>
                              openDetails(
                                item
                              )
                            }
                          >
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


      {/* =====================================================
          INVENTORY DETAILS MODAL
          ===================================================== */}

      {selectedItem && (

        <div className="modal-backdrop">

          <div className="modal-card inventory-detail-modal">

            <div className="modal-header">

              <div>

                <span className="module-eyebrow">
                  INVENTORY INTELLIGENCE
                </span>

                <h2>
                  {getProduct(
                    selectedItem.product_id
                  )?.name ||
                    `Product #${selectedItem.product_id}`}
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setSelectedItem(null)
                }
              >
                <X size={20} />
              </button>

            </div>


            {/* Stock metrics */}

            <div className="inventory-detail-grid">

              <div>

                <span>
                  Physical Stock
                </span>

                <strong>
                  {Number(
                    selectedItem.quantity ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Reserved
                </span>

                <strong>
                  {Number(
                    selectedItem.reserved_quantity ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Available
                </span>

                <strong>
                  {Math.max(
                    0,
                    Number(
                      selectedItem.quantity ||
                        0
                    ) -
                      Number(
                        selectedItem.reserved_quantity ||
                          0
                      )
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Reorder Level
                </span>

                <strong>
                  {Number(
                    selectedItem.reorder_level ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

            </div>


            {/* AI */}

            <div className="inventory-ai-section">

              <div className="section-heading">

                <Brain size={18} />

                <h3>
                  AI Inventory Intelligence
                </h3>

              </div>


              {intelligence[
                selectedItem.product_id
              ] ? (

                <div className="ai-detail-card">

                  <div className="ai-detail-top">

                    <div>

                      <span>
                        Risk Level
                      </span>

                      <strong
                        className={`risk-text ${getRiskClass(
                          intelligence[
                            selectedItem.product_id
                          ].risk_level
                        )}`}
                      >
                        {
                          intelligence[
                            selectedItem.product_id
                          ].risk_level
                        }
                      </strong>

                    </div>


                    <div>

                      <span>
                        Forecast Demand
                      </span>

                      <strong>

                        {forecasts[
                          selectedItem.product_id
                        ]?.forecast_demand ??
                          intelligence[
                            selectedItem.product_id
                          ]?.forecast_demand ??
                          "—"}

                      </strong>

                    </div>

                  </div>


                  <div className="ai-recommendation">

                    <TrendingUp size={17} />

                    <span>
                      {
                        intelligence[
                          selectedItem.product_id
                        ].recommendation
                      }
                    </span>

                  </div>


                  {intelligence[
                    selectedItem.product_id
                  ].reasons?.length > 0 && (

                    <div className="ai-reasons">

                      <strong>
                        Analysis
                      </strong>

                      <ul>

                        {intelligence[
                          selectedItem.product_id
                        ].reasons.map(
                          (reason, index) => (
                            <li
                              key={index}
                            >
                              {reason}
                            </li>
                          )
                        )}

                      </ul>

                    </div>

                  )}

                </div>

              ) : (

                <div className="ai-detail-loading">

                  <Loader2
                    size={20}
                    className="spin"
                  />

                  <span>
                    AI analysis is loading...
                  </span>

                </div>

              )}

            </div>


            {/* Low stock warning */}

            {getStockStatus(
              selectedItem
            ) === "LOW" && (

              <div className="inventory-warning">

                <AlertTriangle
                  size={18}
                />

                <div>

                  <strong>
                    Reorder Attention
                  </strong>

                  <p>
                    Available inventory is at
                    or below the configured
                    reorder threshold.
                  </p>

                </div>

              </div>

            )}

          </div>

        </div>

      )}

    </section>
  );
}