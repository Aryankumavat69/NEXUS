import api from "./client";

export const listInvoices = async () => {
  const response = await api.get(
    "/billing/invoices"
  );

  return response.data;
};


export const createInvoiceFromSalesOrder =
  async (salesOrderId) => {
    const response = await api.post(
      `/billing/invoices/from-sales-order/${salesOrderId}`
    );

    return response.data;
  };


export const createPayment = async (
  payload
) => {
  const response = await api.post(
    "/billing/payments",
    payload
  );

  return response.data;
};


export const getPaymentRisk = async (
  paymentId
) => {
  const response = await api.get(
    `/ai/payment-risk/${paymentId}`
  );

  return response.data;
};