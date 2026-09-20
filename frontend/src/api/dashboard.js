import api from "./client";

export const getDashboardData = async () => {
  const [
    salesOrders,
    inventory,
    suppliers,
    shipments,
    invoices,
  ] = await Promise.all([
    api.get("/sales-orders"),
    api.get("/inventory"),
    api.get("/suppliers"),
    api.get("/shipments"),
    api.get("/billing/invoices"),
  ]);

  return {
    salesOrders: salesOrders.data,
    inventory: inventory.data,
    suppliers: suppliers.data,
    shipments: shipments.data,
    invoices: invoices.data,
  };
};