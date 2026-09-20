import api from "./client";

export const listShipments = async () => {
  const response = await api.get("/shipments");
  return response.data;
};

export const getShipment = async (id) => {
  const response = await api.get(`/shipments/${id}`);
  return response.data;
};

export const getShipmentIntelligence = async (id) => {
  const response = await api.get(
    `/ai/shipment-intelligence/${id}`
  );
  return response.data;
};