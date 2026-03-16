import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

let refreshPromise = null;

http.interceptors.request.use((config) => {
  if (config.skipAuthRefresh) return config;
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("REFRESH_TOKEN_AUSENTE");

    refreshPromise = http
      .post("/auth/refresh", { refreshToken }, { skipAuthRefresh: true })
      .then(({ data }) => {
        const nextAccess = data?.accessToken || data?.token;
        const nextRefresh = data?.refreshToken;

        if (!nextAccess || !nextRefresh) {
          throw new Error("TOKEN_NAO_RETORNADO");
        }

        localStorage.setItem("token", nextAccess);
        localStorage.setItem("refreshToken", nextRefresh);
        return nextAccess;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || "";

    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/forgot-password/");

    const shouldTryRefresh = status === 401 || status === 403;

    if (
      !shouldTryRefresh ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const nextAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return http(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      return Promise.reject(refreshError);
    }
  }
);

export default http;
