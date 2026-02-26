import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

    const accessToken =
      data?.token || data?.accessToken || data?.jwt || data?.access_token;
    const refreshToken = data?.refreshToken;
    if (!accessToken || !refreshToken) throw new Error("TOKEN_NAO_RETORNADO");

    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setToken(accessToken);

    return accessToken;
  }

  async function register({ name, email, password }) {
    const { data } = await http.post("/auth/register", { name, email, password });

    const accessToken =
      data?.token || data?.accessToken || data?.jwt || data?.access_token;
    const refreshToken = data?.refreshToken;
    if (!accessToken || !refreshToken) throw new Error("TOKEN_NAO_RETORNADO");

    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setToken(accessToken);
  }

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      return null;
    }

    const { data } = await http.get("/auth/me");
    setUser(data);
    return data;
  }, [token]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("refreshToken");
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      setUser,
      isAuthenticated,
      login,
      register,
      refreshMe,
      logout,
    }),
    [token, user, isAuthenticated, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
