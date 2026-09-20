import api from "./client";


/* =========================================================
   PURCHASE ORDERS
   ========================================================= */

export const listPurchaseOrders = async () => {
  const response = await api.get("/purchase-orders");
  return response.data;
};


export const getPurchaseOrder = async (id) => {
  const response = await api.get(
    `/purchase-orders/${id}`
  );

  return response.data;
};


export const createPurchaseOrder = async (payload) => {
  const response = await api.post(
    "/purchase-orders",
    payload
  );

  return response.data;
};


export const confirmPurchaseOrder = async (id) => {
  const response = await api.post(
    `/purchase-orders/${id}/confirm`
  );

  return response.data;
};


/* =========================================================
   GOODS RECEIPTS
   ========================================================= */

export const listGoodsReceipts = async () => {
  const response = await api.get(
    "/goods-receipts"
  );

  return response.data;
};


export const getGoodsReceipt = async (id) => {
  const response = await api.get(
    `/goods-receipts/${id}`
  );

  return response.data;
};


export const createGoodsReceipt = async (payload) => {
  const response = await api.post(
    "/goods-receipts",
    payload
  );

  return response.data;
};


export const receiveGoodsReceipt = async (id) => {
  const response = await api.post(
    `/goods-receipts/${id}/receive`
  );

  return response.data;
};