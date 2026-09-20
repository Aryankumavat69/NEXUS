import api from "./client";

export const listShipments = () =>
  api.get("/shipments").then((res) => res.data);

export const getShipment = (id) =>
  api.get(`/shipments/${id}`).then((res) => res.data);

export const getShipmentIntelligence = (id) =>
  api.get(`/ai/shipment-intelligence/${id}`).then((res) => res.data);