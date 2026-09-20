import api from "./client";

export const login = async (email, password) => {
  const response = await api.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};

export const register = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};

export const sendOtp = async (payload) => {
  const response = await api.post("/auth/otp/send", payload);
  return response.data;
};

export const verifyOtp = async (payload) => {
  const response = await api.post("/auth/otp/verify", payload);
  return response.data;
};