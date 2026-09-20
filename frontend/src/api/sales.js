import api from "./client";

export const listSalesOrders = () =>
  api.get("/sales-orders").then((res) => res.data);

export const getSalesOrder = (id) =>
  api.get(`/sales-orders/${id}`).then((res) => res.data);

export const createSalesOrder = (payload) =>
  api.post("/sales-orders", payload).then((res) => res.data);

export const confirmSalesOrder = (id) =>
  api.post(`/sales-orders/${id}/confirm`).then((res) => res.data);