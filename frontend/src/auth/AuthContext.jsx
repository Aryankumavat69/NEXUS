import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";
import { login as loginApi } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem("nexus_access_token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/users/me");
      setUser(response.data);
    } catch {
      localStorage.removeItem("nexus_access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);

    if (!data.access_token) {
      throw new Error("Login succeeded but no access token was returned.");
    }

    localStorage.setItem("nexus_access_token", data.access_token);

    const response = await api.get("/users/me");
    setUser(response.data);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("nexus_access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}