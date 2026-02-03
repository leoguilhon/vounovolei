import { createContext, useContext, useEffect, useMemo, useState } from "react";
import http from "../api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  async function login({ email, password }) {
    const { data } = await http.post("/auth/login", { email, password });

    const token = data?.token || data?.accessToken || data?.jwt || data?.access_token;
    if (!token) throw new Error("TOKEN_NAO_RETORNADO");

    localStorage.setItem("token", token); // grava já
    setToken(token);

    return token;
  }

  async function register({ name, email, password }) {
    await http.post("/auth/register", { name, email, password });
    // após cadastrar, já loga automaticamente
    await login({ email, password });
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, isAuthenticated, login, register, logout }),
    [token, user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
