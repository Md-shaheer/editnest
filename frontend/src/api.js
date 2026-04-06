const LOCAL_API_URL = "http://localhost:8000";
const PROD_API_URL = "/api";

const normalizeApiUrl = (value) => value.replace(/\/+$/, "");

const envApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = normalizeApiUrl(
  envApiUrl || (import.meta.env.DEV ? LOCAL_API_URL : PROD_API_URL)
);

export const REQUEST_TIMEOUT_MS = 45000;
