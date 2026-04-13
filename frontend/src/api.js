const LOCAL_API_URL = "http://localhost:8000";
const PROD_API_URL = "/api";

const normalizeApiUrl = (value) => value.replace(/\/+$/, "");
const isLocalhostHost = (value) =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);

const envApiUrl = import.meta.env.VITE_API_URL?.trim();
const browserHost = typeof window !== "undefined" ? window.location.hostname : "";
const isLocalBrowser = browserHost === "localhost" || browserHost === "127.0.0.1";

const shouldPreferLocalApi =
  import.meta.env.DEV &&
  isLocalBrowser &&
  (!envApiUrl || !isLocalhostHost(envApiUrl));

const resolvedApiUrl = shouldPreferLocalApi
  ? LOCAL_API_URL
  : envApiUrl || (import.meta.env.DEV ? LOCAL_API_URL : PROD_API_URL);

export const API_URL = normalizeApiUrl(resolvedApiUrl);

export const REQUEST_TIMEOUT_MS = 180000;
