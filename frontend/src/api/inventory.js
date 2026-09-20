import api from "./client";

export const listInventory = () =>
  api.get("/inventory").then((res) => res.data);

export const getInventoryIntelligence = (productId) =>
  api
    .get(`/ai/inventory/intelligence/${productId}`)
    .then((res) => res.data);

export const getDemandForecast = (productId) =>
  api.get(`/ai/forecast/products/${productId}`).then((res) => res.data);