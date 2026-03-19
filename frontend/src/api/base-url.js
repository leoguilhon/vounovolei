const LOCAL_API_FALLBACK = "http://localhost:8080";

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && isLocalHost(window.location.hostname)) {
    return LOCAL_API_FALLBACK;
  }

  return "";
}
